import 'server-only';
import { mockCrm, mockCalendar, mockTeams, mockMarket, mockLearning } from './mock';
import { SalesforceCrmAdapter } from './salesforce';
import { GraphCalendarAdapter } from './graph';
import type { AnyAdapter } from './types';

/** Picks the real adapter when credentials exist, the mock otherwise. */
export function adapters(): Record<string, AnyAdapter> {
  const sf = process.env.SALESFORCE_INSTANCE_URL ? new SalesforceCrmAdapter({ instanceUrl: process.env.SALESFORCE_INSTANCE_URL, clientId: process.env.SALESFORCE_CLIENT_ID || '', privateKey: process.env.SALESFORCE_PRIVATE_KEY || '', username: process.env.SALESFORCE_USERNAME || '' }) : mockCrm;
  const graph = process.env.GRAPH_TENANT_ID ? new GraphCalendarAdapter({ tenantId: process.env.GRAPH_TENANT_ID, clientId: process.env.GRAPH_CLIENT_ID || '', clientSecret: process.env.GRAPH_CLIENT_SECRET || '' }) : mockCalendar;
  return { salesforce: sf, m365: graph, teams: mockTeams, market: mockMarket, workday: mockLearning };
}
