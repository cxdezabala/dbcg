import type { CrmAdapter, SyncResult } from './types';

/**
 * Salesforce CRM adapter (read-only). Stub for production.
 * TODO(production): OAuth 2.0 JWT bearer flow with a read-only integration user; query
 * Account / Opportunity / Contact / Task via the REST API (SOQL, incremental by SystemModstamp),
 * map sharing rules to SYNERGON ownerRoles, upsert into the mirror tables. Never call write APIs.
 */
export class SalesforceCrmAdapter implements CrmAdapter {
  readonly id = 'salesforce' as const;
  constructor(private readonly cfg: { instanceUrl: string; clientId: string; privateKey: string; username: string }) {}
  async sync(): Promise<SyncResult> { throw new Error('SalesforceCrmAdapter.sync not implemented (TODO: read-only REST sync for ' + this.cfg.instanceUrl + ')'); }
  async listAccountIds(): Promise<string[]> { throw new Error('SalesforceCrmAdapter.listAccountIds not implemented'); }
}
