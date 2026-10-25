export type OpportunityType = 'hackathon' | 'conference' | 'workshop' | 'internship' | 'job';

export type OpportunityFormat = 'online' | 'in-person' | 'hybrid';

export type DiscoveryConfidence = 'high' | 'low';

export type OpportunityStatus = 'published' | 'needs_review' | 'archived';

export type OpportunityOrigin = 'adapter' | 'user_submitted' | 'admin_entered' | 'ai_extracted';

export type LinkStatus = 'ok' | 'unreachable' | 'unknown';

export type ListingStatus = 'open' | 'closed' | 'expired' | 'stale';

export interface EventComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Contributor {
  id: string;
  name: string;
  handle: string;
  email: string;
  role?: string; // e.g. 'author', 'presenter', 'attendee', 'co-author'
  addedAt: string;
}

export interface UserEventInteraction {
  starred?: boolean;
  participating?: boolean;
  comments?: EventComment[];
  reminderEnabled?: boolean;
}

export interface TechOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  conference_tier?: string | null; // e.g. 'Core A*', 'Core A', 'Core B', 'Core C', 'Industry / Non-Academic'
  subfield?: string | null; // e.g. 'AI / Machine Learning', 'Systems & Architecture', 'Security & Privacy', etc.
  organizer: string;
  start_date: string; // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  end_date: string;   // ISO format or deadline for internships/jobs
  submission_deadline?: string | null; // ISO date for CFP / paper submission deadline (conferences)
  format: OpportunityFormat;
  location?: string | null;
  source_url: string;
  description: string;
  discovery_confidence: DiscoveryConfidence;
  confidence_reasons?: string[];
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
  submitted_by?: string; // Handle/identity of live user who submitted
  starred_count?: number;
  participants_count?: number;
  contributors?: Contributor[]; // Signed-in users tagged as contributors/co-participants
  skills?: string[]; // Extracted / associated tech stack skills

  // Provenance (Problem 2)
  origin?: OpportunityOrigin;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_basis?: string | null;

  // Regular Job Listing specific fields (Problem 5)
  company?: string;
  posted_date?: string | null;
  application_deadline?: string | null; // Missing job deadline is valid: "no deadline listed"
  link_status?: LinkStatus;
  last_checked_at?: string | null;
  listing_status?: ListingStatus;
  work_mode?: OpportunityFormat;
}

export interface PipelineRunLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  events_scanned: number;
  events_added: number;
  duplicates_skipped: number;
  events_archived: number;
  low_confidence_count: number;
  errors: string[];
  details?: {
    added_titles?: string[];
    skipped_titles?: string[];
    updated_titles?: string[];
    ai_logs?: any[];
  };
}

export interface FilterOptions {
  type?: OpportunityType | 'all';
  conference_tier?: string | 'all';
  format?: OpportunityFormat | 'all';
  company?: string | 'all';
  searchQuery?: string;
  viewExpired?: boolean;
}

export interface DeadlineCollisionCluster {
  id: string;
  startDate: string;
  endDate: string;
  daysSpan: number;
  severity: 'low' | 'medium' | 'critical';
  opportunities: TechOpportunity[];
  title: string;
  message: string;
}

// Problem 7 & 8 Types
export interface UserUpdate {
  id: string;
  user_id: string;
  opportunity_id: string;
  type: 'new_opportunity' | 'deadline_change' | 'deadline_approaching';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id?: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  categories: OpportunityType[];
  unsubscribe_token: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  channel: 'in_app' | 'email';
  event_key: string;
  subject: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string | null;
  created_at: string;
}

export interface RoleAuditLog {
  id: string;
  target_user_id: string;
  changed_by: string;
  old_role: string;
  new_role: string;
  timestamp: string;
}

export type AuditLogCategory = 'auth' | 'admin' | 'security' | 'pipeline' | 'content';

export type AuditActionType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_ROOT_LOGIN'
  | 'AUTH_SIGNUP_REQUEST'
  | 'AUTH_OTP_VERIFIED'
  | 'AUTH_OTP_FAILED'
  | 'AUTH_OTP_RESENT'
  | 'AUTH_LOGOUT'
  | 'ADMIN_ROLE_CHANGE'
  | 'ADMIN_ACCOUNT_REVOKED'
  | 'ADMIN_ACCOUNT_RESTORED'
  | 'ADMIN_ACCOUNT_ERASED'
  | 'ADMIN_SCHEDULE_UPDATE'
  | 'OPPORTUNITY_SUBMITTED'
  | 'OPPORTUNITY_APPROVED'
  | 'OPPORTUNITY_REJECTED'
  | 'OPPORTUNITY_UPDATED'
  | 'PIPELINE_RUN_COMPLETED'
  | 'PIPELINE_RUN_FAILED'
  | 'AI_EXTRACTION_SUCCESS'
  | 'AI_EXTRACTION_FAILED';

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  category: AuditLogCategory;
  action: AuditActionType;
  actor: {
    id?: string;
    handle?: string;
    email?: string;
    role?: string;
    ip?: string;
  };
  target?: {
    type: 'user' | 'opportunity' | 'pipeline' | 'schedule' | 'auth';
    id?: string;
    label?: string;
  };
  status: 'success' | 'failure' | 'warning' | 'info';
  description: string;
  metadata?: Record<string, any>;
}
