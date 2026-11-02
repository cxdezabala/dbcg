import type { CalendarAdapter, SyncResult } from './types';

/**
 * Microsoft Graph calendar adapter. Stub for production.
 * TODO(production): app registration in Entra ID with Calendars.ReadBasic / Mail.ReadBasic
 * (metadata only — no message bodies), delta queries per user, map attendees' domains to accounts.
 */
export class GraphCalendarAdapter implements CalendarAdapter {
  readonly id = 'm365' as const;
  constructor(private readonly cfg: { tenantId: string; clientId: string; clientSecret: string }) {}
  async sync(): Promise<SyncResult> { throw new Error('GraphCalendarAdapter.sync not implemented (tenant ' + this.cfg.tenantId + ')'); }
  async upcomingMeetings(): Promise<{ title: string; when: string; accountId?: string }[]> { throw new Error('GraphCalendarAdapter.upcomingMeetings not implemented'); }
}
