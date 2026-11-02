// SYNERGON commercial pipeline — fictional demonstration data (YTD 2026, values in €M).
window.SYNP = (function(){
const STAGES=[{id:'qual',label:'Qualification',p:.1},{id:'disc',label:'Discovery',p:.25},{id:'design',label:'Solution design',p:.4},{id:'prop',label:'Proposal',p:.6},{id:'nego',label:'Negotiation',p:.8}];
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];
let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
const r2=v=>Math.round(v*100)/100;
const ACCTS=['Banco Ribera','Lusitania Bank','Solenne Insurance','Castilla Energía','Albion Rail','Pennine Water','Iberia Foods','Atlántico Logistics','Gulf Ports Authority','Emirates Mobility','Riyadh Health Cluster','Najd Utilities','Thames Housing','Northgate Pharma','Cobalt Mining','Oasis Hospitality','Delta Airways','Marlow Chemicals','Vega Telecom','Sierra Retail'];
const OPPN=['Operating model redesign','AI customer service pilot','Leadership academy','Data platform strategy','Cost transformation','Procurement excellence','Digital channels programme','Workforce reskilling','Pricing review','Supply chain diagnostic'];
const CLOSE=['Nov 2026','Dec 2026','Q1 2027','Q2 2027'];
const NEXT=['Sponsor meeting','Proposal review','Scope workshop','Procurement terms','Expert input requested','Business case validation'];
const REASONS=['Price — lower-cost competitor','Budget frozen by client','Lost to incumbent','No decision — priorities changed','Scope moved in-house'];
const CDATES=['Oct 2026','Sep 2026','Aug 2026','Jul 2026','Jun 2026','May 2026','Apr 2026','Mar 2026'];
const pick=a=>a[Math.floor(rnd()*a.length)];

const JAV_OPPS=[
 {acct:'Meridian Financial Group',acctId:'meridian',name:'Customer Operations Modernisation',stage:1,value:1.6,close:'Q1 2027',next:'COO meeting 12 Nov'},
 {acct:'Meridian Financial Group',acctId:'meridian',name:'Data Governance Advisory',stage:3,value:.8,close:'Dec 2026',next:'Proposal review with CIO'},
 {acct:'Horizon Telecom',acctId:'horizon',name:'Care Platform Consolidation',stage:0,value:1.9,close:'Q2 2027',next:'Tender pre-briefing'},
 {acct:'Crescent Retail Group',acctId:'crescent',name:'AI Service for Digital Channels',stage:1,value:.9,close:'Q2 2027',next:'Quantify backlog cost'},
 {acct:'Banco Ribera',name:'Branch Network Analytics',stage:4,value:.4,close:'Nov 2026',next:'Procurement terms'},
 {acct:'Solenne Insurance',name:'Claims Operating Review',stage:2,value:.3,close:'Jan 2027',next:'Expert input requested'}];
const JAV_CLOSED=[
 {acct:'Banco Ribera',name:'Digital onboarding diagnostic',won:true,value:.6,date:'Sep 2026'},
 {acct:'Lusitania Bank',name:'Branch operating model',won:false,value:.7,date:'Aug 2026',reason:'Price — lower-cost competitor'},
 {acct:'Meridian Financial Group',name:'Complaints analytics pilot',won:true,value:.5,date:'Jul 2026'},
 {acct:'Solenne Insurance',name:'Distribution strategy',won:false,value:.3,date:'Jun 2026',reason:'No decision — priorities changed'},
 {acct:'Iberia Foods',name:'Pricing review',won:true,value:.3,date:'May 2026'},
 {acct:'Castilla Energía',name:'Procurement excellence',won:true,value:.3,date:'Apr 2026'},
 {acct:'Albion Rail',name:'Customer service diagnostic',won:false,value:.3,date:'Mar 2026',reason:'Lost to incumbent'}];

const TEAMS=[
 {id:'eiu',name:'Enterprise · Iberia & UK',bu:'Europe',lead:'Laura Bennett',split:[.22,.28,.18,.2,.12],fixed:[['Javier Morales',5.9,2.1,1.3,3.0],['Ben Carter',4.6,2.8,.9,3.2],['Lucía Martín',2.9,1.4,1.1,2.2],['Tom Hughes',3.4,1.0,1.6,2.4],['Ana Prieto',2.2,1.7,.6,2.0],['Oliver Shaw',1.8,.9,.8,1.6],['Marta Gil',2.6,1.2,.7,1.8],['James Reed',1.5,.6,.9,1.5],['Clara Vidal',2.4,1.1,.5,1.6],['Laura Bennett',1.7,.9,.4,1.2]]},
 {id:'uki',name:'UK Industrial',bu:'Europe',lead:'Mark Ellis',split:[.18,.25,.2,.22,.15],gen:[18.4,9.1,6.2],names:['Mark Ellis','Sam Patel','Holly Grant','Owen Price','Fiona Walsh','Rob Turner','Neha Shah','Chris Doyle','Emma Fox','Dan Hollis','Priya Kaur']},
 {id:'imm',name:'Iberia Mid-Market',bu:'Europe',lead:'Pedro Alonso',split:[.3,.27,.15,.17,.11],gen:[12.6,7.4,6.9],names:['Pedro Alonso','Irene Sáez','Diego Romero','Sara Ortiz','Raúl Molina','Elena Castro','Pablo Núñez','Laia Ferrer','Hugo Vega','Nerea Gil','Álvaro Ruiz','Carla Méndez']},
 {id:'ge',name:'Gulf Energy',bu:'Middle East',lead:'Karim Al-Fayed',split:[.15,.22,.23,.24,.16],gen:[21.3,8.8,4.1],names:['Karim Al-Fayed','Noura Saleh','Tariq Hassan','Lina Haddad','Yousef Amin','Reem Khalil','Fahad Nasser','Dina Azar','Majed Saeed']},
 {id:'urt',name:'UAE Retail & Telecom',bu:'Middle East',lead:'Sara Mahmoud',split:[.24,.27,.17,.19,.13],gen:[16.9,7.9,7.2],names:['Sara Mahmoud','Omar Farouk','Aisha Rahman','Hamad Ali','Leila Nasser','Zaid Kareem','Maya Haddad','Rami Aziz','Huda Saleh','Faris Odeh','Nadia Barakat','Samir Qasim','Yara Jaber','Khaled Ibrahim']},
 {id:'ksa',name:'KSA Public Sector',bu:'Middle East',lead:'Abdullah Rahman',split:[.28,.3,.16,.16,.1],gen:[6.8,2.2,2.9],names:['Abdullah Rahman','Hessa Al-Qahtani','Saad Al-Harbi','Mona Al-Dosari']}];

function genOpps(name,stages){return stages.map((v,i)=>v>=.05?{acct:pick(ACCTS),name:pick(OPPN),stage:i,value:r2(v),close:pick(CLOSE),next:pick(NEXT)}:null).filter(Boolean)}
function genClosed(won,lost,wonN,lostN){const out=[];for(let i=0;i<wonN;i++)out.push({acct:pick(ACCTS),name:pick(OPPN),won:true,value:r2(won/wonN),date:pick(CDATES)});for(let i=0;i<lostN;i++)out.push({acct:pick(ACCTS),name:pick(OPPN),won:false,value:r2(lost/lostN),date:pick(CDATES),reason:pick(REASONS)});return out}
function months(won){const w=MONTHS.map(()=>.4+rnd());const t=w.reduce((a,b)=>a+b,0);return w.map(x=>r2(won*x/t))}
function mk(team,name,pipe,won,lost,quota){
 const isJ=name==='Javier Morales';
 const stages=isJ?STAGES.map((_,i)=>JAV_OPPS.filter(o=>o.stage===i).reduce((t,o)=>t+o.value,0)):(()=>{const n=team.split.map(x=>x*(.7+rnd()*.6));const t=n.reduce((a,b)=>a+b,0);return n.map(x=>r2(pipe*x/t))})();
 const wonN=isJ?4:Math.max(1,Math.round(won/.3)),lostN=isJ?3:Math.max(1,Math.round(lost/.27));
 return {name,team:team.name,teamId:team.id,bu:team.bu,pipe,won,lost,wonN:isJ?7:wonN,lostN:isJ?5:lostN,quota,stages,months:months(won),
  opps:isJ?JAV_OPPS:genOpps(name,stages),closed:isJ?JAV_CLOSED:genClosed(won,lost,Math.min(wonN,3),Math.min(lostN,2))};}
TEAMS.forEach(t=>{
 if(t.fixed)t.execs=t.fixed.map(([n,p,w,l,q])=>mk(t,n,p,w,l,q));
 else{const [P,W,L]=t.gen,n=t.names.length,wt=t.names.map(()=>.5+rnd()),s=wt.reduce((a,b)=>a+b,0);
  t.execs=t.names.map((nm,i)=>{const f=wt[i]/s,won=r2(W*f*(.8+rnd()*.4));return mk(t,nm,r2(P*f),won,r2(L*f*(.7+rnd()*.6)),r2(won/(.6+rnd()*.5)))});}
});
return {STAGES,MONTHS,TEAMS};
})();
