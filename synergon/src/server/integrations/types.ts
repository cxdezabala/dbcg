// Integration adapters. The MVP ships mock implementations that read the seeded data;
// real connectors implement the same interfaces (Salesforce is strictly read-only).
export interface SyncResult { records: number; at: Date }

export interface CrmAdapter {
  readonly id: 'salesforce';
  /** Pulls accounts, opportunities, contacts and activities. Never writes back to the CRM. */
  sync(): Promise<SyncResult>;
  listAccountIds(): Promise<string[]>;
}
export interface CalendarAdapter {
  readonly id: 'm365';
  /** Calendar and e-mail metadata only — message bodies are never ingested. */
  sync(): Promise<SyncResult>;
  upcomingMeetings(userEmail: string): Promise<{ title: string; when: string; accountId?: string }[]>;
}
export interface CollaborationAdapter { readonly id: 'teams'; sync(): Promise<SyncResult> }
export interface MarketFeedAdapter { readonly id: 'market'; sync(): Promise<SyncResult> }
export interface LearningAdapter { readonly id: 'workday'; sync(): Promise<SyncResult> }
export type AnyAdapter = CrmAdapter | CalendarAdapter | CollaborationAdapter | MarketFeedAdapter | LearningAdapter;
