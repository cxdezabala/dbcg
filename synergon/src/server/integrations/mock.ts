import 'server-only';
import { db } from '../db';
import type { CrmAdapter, CalendarAdapter, CollaborationAdapter, MarketFeedAdapter, LearningAdapter } from './types';

/** Mock CRM: the seed is the Salesforce mirror. */
export const mockCrm: CrmAdapter = {
  id: 'salesforce',
  async sync() { const n = (await db.account.count()) + (await db.opportunity.count()) + (await db.contact.count()) + (await db.interaction.count()); return { records: Math.max(n, 1284), at: new Date() }; },
  async listAccountIds() { return (await db.account.findMany({ select: { id: true } })).map(a => a.id); },
};
export const mockCalendar: CalendarAdapter = {
  id: 'm365',
  async sync() { return { records: 4, at: new Date() }; },
  async upcomingMeetings() { return [{ title: 'Meridian COO meeting', when: '12 Nov', accountId: 'meridian' }, { title: 'Meridian procurement review', when: '12 Nov', accountId: 'meridian' }]; },
};
export const mockTeams: CollaborationAdapter = { id: 'teams', async sync() { return { records: await db.expertRequest.count(), at: new Date() }; } };
export const mockMarket: MarketFeedAdapter = { id: 'market', async sync() { return { records: await db.signal.count(), at: new Date() }; } };
export const mockLearning: LearningAdapter = { id: 'workday', async sync() { return { records: 0, at: new Date() }; } };
