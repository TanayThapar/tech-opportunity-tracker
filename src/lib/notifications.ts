import nodemailer from 'nodemailer';
import { TechOpportunity, UserEventInteraction, OpportunityType } from '@/types';
import {
  getUserInteractions,
  getNotificationPreference,
  getUserUpdates,
  addUserUpdate,
  hasNotificationBeenSent,
  recordNotification,
  getProfileById,
} from '@/lib/store';

export interface NotificationServiceConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  appBaseUrl?: string;
}

export function getNotificationConfig(): NotificationServiceConfig {
  return {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM || 'TechRadar <notifications@tech-opportunity-tracker.internal>',
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://tech-opportunity-tracker.vercel.app',
  };
}

/**
 * Creates SMTP transport using nodemailer if configured.
 */
function createSmtpTransporter() {
  const config = getNotificationConfig();
  if (!config.smtpHost) return null;

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
}

/**
 * Generates in-app user updates and sends email digests to opted-in users after a pipeline run.
 * Rules:
 * 1. Generated strictly from verified DB state.
 * 2. Deduplicated: one notification per user per event per change.
 * 3. Quiet failure: failed email sends are recorded for retry and never block the pipeline.
 * 4. Labels community dates as unconfirmed.
 */
export async function processUserUpdatesAndNotifications(
  allOpportunities: TechOpportunity[],
  newlyAdded: TechOpportunity[],
  updatedOpportunities: TechOpportunity[],
  activeUserIds: string[]
): Promise<{ updatesGenerated: number; emailsSent: number; errors: string[] }> {
  const now = new Date();
  const config = getNotificationConfig();
  const transporter = createSmtpTransporter();

  let updatesGenerated = 0;
  let emailsSent = 0;
  const errors: string[] = [];

  for (const userId of activeUserIds) {
    try {
      const userProfile = await getProfileById(userId);
      const pref = await getNotificationPreference(userId);
      const userInteractions = await getUserInteractions(userId);

      const pendingEmailItems: { subject: string; message: string; eventKey: string }[] = [];

      // 1. New published opportunities matching user category preferences
      for (const opp of newlyAdded) {
        if (opp.status !== 'published') continue; // Only published items!
        if (!pref.categories.includes(opp.type)) continue;

        const eventKey = `new_opp_${opp.id}`;
        const alreadySent = await hasNotificationBeenSent(userId, eventKey, 'in_app');
        if (!alreadySent) {
          await addUserUpdate({
            user_id: userId,
            opportunity_id: opp.id,
            type: 'new_opportunity',
            title: `New ${opp.type.toUpperCase()}: ${opp.title}`,
            message: `A new opportunity from ${opp.organizer} has been published (${opp.start_date}).`,
            read: false,
          });
          await recordNotification({
            user_id: userId,
            channel: 'in_app',
            event_key: eventKey,
            subject: `New opportunity: ${opp.title}`,
            message: opp.description,
            status: 'sent',
          });
          updatesGenerated++;

          if (pref.email_enabled && userProfile?.email) {
            pendingEmailItems.push({
              subject: `New Opportunity: ${opp.title}`,
              message: `A new ${opp.type} has been published: ${opp.title} (${opp.start_date}). Source: ${opp.source_url}`,
              eventKey,
            });
          }
        }
      }

      // 2. Deadline changes on saved/starred items
      for (const opp of updatedOpportunities) {
        const interaction = userInteractions[opp.id];
        if (!interaction?.starred && !interaction?.reminderEnabled) continue;

        const eventKey = `deadline_change_${opp.id}_${opp.submission_deadline || opp.end_date}`;
        const alreadySent = await hasNotificationBeenSent(userId, eventKey, 'in_app');
        if (!alreadySent) {
          await addUserUpdate({
            user_id: userId,
            opportunity_id: opp.id,
            type: 'deadline_change',
            title: `Deadline Updated: ${opp.title}`,
            message: `The deadline for ${opp.title} has been updated to ${opp.submission_deadline || opp.end_date}. (Dates from community-maintained dataset).`,
            read: false,
          });
          await recordNotification({
            user_id: userId,
            channel: 'in_app',
            event_key: eventKey,
            subject: `Deadline Updated: ${opp.title}`,
            message: `Updated deadline: ${opp.submission_deadline || opp.end_date}`,
            status: 'sent',
          });
          updatesGenerated++;

          if (pref.email_enabled && userProfile?.email) {
            pendingEmailItems.push({
              subject: `Deadline Updated: ${opp.title}`,
              message: `The submission deadline for "${opp.title}" has been updated to ${opp.submission_deadline || opp.end_date}. Notice: Dates are community-maintained.`,
              eventKey,
            });
          }
        }
      }

      // 3. Deadlines closing within 7 days and 1 day on saved items
      for (const [oppId, interaction] of Object.entries(userInteractions)) {
        if (!interaction?.starred && !interaction?.reminderEnabled) continue;
        const opp = allOpportunities.find(o => o.id === oppId);
        if (!opp || opp.status !== 'published') continue;

        const targetDateStr = opp.submission_deadline || opp.end_date;
        if (!targetDateStr) continue;

        const targetTime = new Date(targetDateStr).getTime();
        const diffMs = targetTime - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 7 || diffDays === 1) {
          const eventKey = `deadline_closing_${diffDays}d_${opp.id}`;
          const alreadySent = await hasNotificationBeenSent(userId, eventKey, 'in_app');
          if (!alreadySent) {
            const urgency = diffDays === 1 ? 'URGENT: 24h Remaining' : 'Reminder: 7 Days Remaining';
            await addUserUpdate({
              user_id: userId,
              opportunity_id: opp.id,
              type: 'deadline_approaching',
              title: `${urgency} - ${opp.title}`,
              message: `The submission/application deadline is on ${targetDateStr}. (Dates from community-maintained dataset).`,
              read: false,
            });
            await recordNotification({
              user_id: userId,
              channel: 'in_app',
              event_key: eventKey,
              subject: `${urgency}: ${opp.title}`,
              message: `Deadline: ${targetDateStr}`,
              status: 'sent',
            });
            updatesGenerated++;

            if (pref.email_enabled && userProfile?.email) {
              pendingEmailItems.push({
                subject: `${urgency}: ${opp.title}`,
                message: `The deadline for "${opp.title}" closes in ${diffDays} day(s) on ${targetDateStr}. Confirm final dates on the official portal: ${opp.source_url}`,
                eventKey,
              });
            }
          }
        }
      }

      // 4. Send email digest if opted-in and items exist
      if (pref.email_enabled && userProfile?.email && pendingEmailItems.length > 0 && transporter) {
        const unsubLink = `${config.appBaseUrl}/api/notifications/unsubscribe?token=${pref.unsubscribe_token}`;
        const emailBody = `
Hello ${userProfile.name},

Here are your latest opportunity updates from TechRadar:

${pendingEmailItems.map(item => `• ${item.subject}\n  ${item.message}`).join('\n\n')}

---
Community Notice: Dates and deadlines are community-maintained and not re-confirmed against organizer sites.
To unsubscribe from these email notifications with 1 click:
${unsubLink}
        `.trim();

        try {
          await transporter.sendMail({
            from: config.smtpFrom,
            to: userProfile.email,
            subject: `TechRadar Digest: ${pendingEmailItems.length} new update(s)`,
            text: emailBody,
          });

          for (const item of pendingEmailItems) {
            await recordNotification({
              user_id: userId,
              channel: 'email',
              event_key: item.eventKey,
              subject: item.subject,
              message: item.message,
              status: 'sent',
            });
          }
          emailsSent++;
        } catch (emailErr: any) {
          const msg = `Failed to deliver email digest to ${userProfile.email}: ${emailErr.message || String(emailErr)}`;
          console.warn(msg);
          errors.push(msg);

          for (const item of pendingEmailItems) {
            await recordNotification({
              user_id: userId,
              channel: 'email',
              event_key: item.eventKey,
              subject: item.subject,
              message: item.message,
              status: 'failed',
              error: emailErr.message,
            });
          }
        }
      }
    } catch (userErr: any) {
      errors.push(`Error processing notifications for user ${userId}: ${userErr.message}`);
    }
  }

  return { updatesGenerated, emailsSent, errors };
}
