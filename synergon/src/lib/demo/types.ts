export type Role = 'exec' | 'lead' | 'director' | 'admin';
export type View = 'home' | 'ci' | 'radar' | 'studio' | 'growth' | 'collab' | 'command' | 'settings';
export type Lens = 'consulting' | 'execed';

export interface RoleInfo { name: string; first: string; title: string; initials: string; scope: string }
export type RoleInfoMap = Record<Role, RoleInfo>;

export interface AccountOpp { name: string; stage: string; value: string; close: string; signal: string }
export interface AccountPerson { name: string; title: string; stance: string; strength: string; lvl: number }
export interface Touch { date: string; type: string; text: string }
export interface Account {
  id: string; name: string; industry: string; geo: string; hq: string; size: string; rel: string; value: string; last: string; tier: string;
  owners: Role[]; owner: string; obs: string; costBase: number; opps: AccountOpp[]; people: AccountPerson[]; touches: Touch[];
  insights: string[]; actions: string[]; hyp: string; challenge: string;
}
export interface Signal {
  id: string; title: string; industry: string; geo: string; kind: string; verified: boolean; horizon: string; date: string; x: number; y: number;
  sources: string[]; summary: string; implication: string; action: string; companies: string[];
}
export interface Expert {
  id: string; name: string; title: string; loc: string; domain: string; domains: string[]; industries: string[]; delivered: number; contribs: number;
  avail: string; interests: string; bio: string;
}
export interface Knowledge { id: string; title: string; author: string; domain: string; state: string; saves: number; date: string; body: string; comments: string[] }
export interface Cap { id: string; name: string; cur: number; tgt: number; focus?: boolean }
export interface CapTeam { name: string; region: string; n: number; v: number[]; mine?: boolean }
export interface Priority { id: string; name: string; progress: number; acts: number; teams: string; risk: string; action: string }
export interface Theme { id: string; title: string; confidence: string; conf: string; bus: string[]; evidence: string[]; implication: string }
export interface OppHyp { title: string; value: string; sources: string[] }
export interface LeaderRec { obs: string; evidence: string; impl: string; conf: string; action: string; role: string; theme: string | null }
export interface Alt { id: string; name: string; summary: string; assumptions: string; benefits: string; limitations: string; tradeoffs: string; fit: number; ttv: string; sav: string; risk: string; cap: string; inv: string; ws: string[] }
export interface Workstream { id: string; name: string; del: string; caps: string; dep: string; cost: number; save: number }
export interface Pack { framing: [string, string][]; alts: Alt[]; ws: Workstream[]; experts: [string, number, string][] }
export interface Lesson { title: string; mins: number; cards: [string, string][]; quiz: { q: string; opts: string[]; ok: number }[] }
export interface RolePlayTurn { say: string; opts: [string, number, string][] }
export interface SeedSolution {
  id: string; title: string; acct: string; pack: string; stage: number; challenge: string; imported: boolean; framed: boolean; alt: string | null;
  ws: Record<string, boolean>; expert: Record<string, string>; scenario: string; costBase: number; updated: string; submitted: boolean;
}
export interface Completed { title: string; acct: string; team: string; when: string }

export interface Bench { revPerEmp: number; op: number; net: number; growth: number; ld: number; execShare: number; leader: number; consPct: number; bus: string[] }
export interface BusinessUnit { name: string; share: number | null; emp: number; fit: Record<Lens, string>; why: Record<Lens, string> }
export interface RadarPerson { name: string; role: string; unit: string; src: string; rel: string; li: string | null; lens: Lens[]; why: string; approach: string }
export interface Peer { name: string; rev: number; emp: number; op: number; growth: number; ai: string; note: string }
export interface Rival { name: string; type: string; strength: string; weak: string; how: string }
export interface RadarCompany {
  id: string; crm: string | null; name: string; sector: string; sub: string; hq: string; countries: string; founded: number | null; listed: boolean;
  exchange?: string; owner?: string; web: string; li: string; liFollowers: string | null; ai: string; custom?: boolean;
  employees: number; revenue: number | null; net: number | null; op: number | null; growth: number | null; ldReported?: number | null;
  desc: string;
  ar?: { year: number; pages: string; kpis: [string, string, string][]; priorities: [string, string, string][]; talent: string[]; risks: string[] };
  bus: BusinessUnit[]; peers: Peer[]; rivals: Record<Lens, Rival[]>; people: RadarPerson[];
  hooks: Record<Lens, [string, string][]>; qs: { all: string[]; consulting?: string[]; execed?: string[] }; signals: string[]; sources: string[];
}
