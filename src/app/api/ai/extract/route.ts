import { NextRequest, NextResponse } from 'next/server';
import { extractOpportunityWithGemini } from '@/lib/ai/provider';
import { safeFetch } from '@/lib/safeFetch';
import { appendAuditLog } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { url, text, apiKey: providedKey, model } = body;

    // Resolve Gemini API Key (request body, custom header, or server env var)
    const apiKey =
      providedKey ||
      req.headers.get('x-gemini-api-key') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A Gemini API Key is required. You can obtain a 100% free API key at https://aistudio.google.com/apikey and paste it into the field.',
        },
        { status: 400 }
      );
    }

    let pageContent = text || '';

    // If a URL was provided and no raw text, fetch the content securely using safeFetch (SSRF protected)
    if (url && !pageContent) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return NextResponse.json(
          { success: false, error: 'Invalid URL. Must begin with http:// or https://' },
          { status: 400 }
        );
      }

      const fetchResult = await safeFetch(url, {
        timeoutMs: 8000,
        maxSizeBytes: 250000,
      });

      if (!fetchResult.ok || !fetchResult.body) {
        return NextResponse.json(
          {
            success: false,
            error: `Unable to fetch target page (${fetchResult.statusCode || 'network error'}): ${fetchResult.error || 'Server unreachable'}`,
          },
          { status: 422 }
        );
      }

      pageContent = fetchResult.body;
    }

    if (!pageContent || pageContent.trim().length < 15) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide either an accessible webpage URL or paste the event announcement text.',
        },
        { status: 400 }
      );
    }

    const extraction = await extractOpportunityWithGemini(
      apiKey,
      url || 'user_provided_text',
      pageContent,
      model || 'gemini-1.5-flash'
    );

    if (extraction.error || !extraction.item) {
      await appendAuditLog({
        category: 'pipeline',
        action: 'AI_EXTRACTION_FAILED',
        actor: { handle: 'AI Gemini Parser' },
        target: { type: 'opportunity', label: url || 'Pasted text' },
        status: 'failure',
        description: `AI opportunity extraction failed: ${extraction.error || 'Parsing error'}`,
      });
      return NextResponse.json(
        { success: false, error: extraction.error || 'Failed to extract opportunity details.' },
        { status: 422 }
      );
    }

    await appendAuditLog({
      category: 'pipeline',
      action: 'AI_EXTRACTION_SUCCESS',
      actor: { handle: 'AI Gemini Parser' },
      target: { type: 'opportunity', label: extraction.item.title || url },
      status: 'success',
      description: `Gemini extracted opportunity "${extraction.item.title}" (${extraction.item.type || 'conference'})`,
      metadata: { url, model: model || 'gemini-1.5-flash' },
    });

    return NextResponse.json({
      success: true,
      data: extraction.raw,
      item: extraction.item,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during AI extraction.' },
      { status: 500 }
    );
  }
}
