export type OpportunityType = 'hackathon' | 'conference' | 'workshop' | 'internship';

export type OpportunityFormat = 'online' | 'in-person' | 'hybrid';

export type DiscoveryConfidence = 'high' | 'low';

export type OpportunityStatus = 'published' | 'needs_review' | 'archived';

export interface TechOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  conference_tier?: string | null; // e.g. 'Core A*', 'Core A', 'Core B', 'Core C', 'Tier 1 Industry', 'Regional', etc.
  organizer: string;
  start_date: string; // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  end_date: string;   // ISO format or deadline for internships
  format: OpportunityFormat;
  location?: string | null;
  source_url: string;
  description: string;
  discovery_confidence: DiscoveryConfidence;
  confidence_reasons?: string[];
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
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
  };
}

export interface FilterOptions {
  type?: OpportunityType | 'all';
  conference_tier?: string | 'all';
  format?: OpportunityFormat | 'all';
  searchQuery?: string;
  viewExpired?: boolean;
}
