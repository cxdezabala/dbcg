// Radar360 client intelligence — fictional demonstration companies, annual-report extracts and sector benchmarks.
window.SYNR = (function(){
const BENCH={
 'Financial Services':{revPerEmp:.52,op:30,net:18,growth:4.5,ld:1000,execShare:.26,leader:.035,consPct:.0028,bus:['Retail banking','Corporate banking','Operations & technology','Risk & compliance']},
 'Telecommunications':{revPerEmp:.55,op:22,net:11,growth:3,ld:900,execShare:.22,leader:.03,consPct:.0025,bus:['Consumer','Enterprise','Network & IT','Customer care']},
 'Retail':{revPerEmp:.15,op:7,net:4,growth:5,ld:420,execShare:.2,leader:.02,consPct:.002,bus:['Stores','E-commerce','Supply chain','Merchandising']},
 'Energy':{revPerEmp:.6,op:24,net:14,growth:5,ld:1050,execShare:.22,leader:.03,consPct:.0022,bus:['Operations','Projects & engineering','Trading','Corporate functions']},
 'Industrial Manufacturing':{revPerEmp:.36,op:11,net:6.5,growth:4,ld:700,execShare:.2,leader:.025,consPct:.002,bus:['Manufacturing','Engineering & R&D','Aftermarket services','Supply chain']},
 'Insurance':{revPerEmp:.45,op:14,net:9,growth:4,ld:950,execShare:.25,leader:.035,consPct:.0026,bus:['Underwriting','Claims','Distribution','Operations & IT']},
 'Logistics':{revPerEmp:.2,op:8,net:4.5,growth:6,ld:380,execShare:.18,leader:.02,consPct:.0018,bus:['Freight & forwarding','Warehousing','Last mile','Technology']}};
const LENS={consulting:{label:'Business & technology consulting',short:'Consulting'},execed:{label:'Executive education',short:'Executive education'}};
const bu=(name,share,emp,fc,wc,fe,we)=>({name,share,emp,fit:{consulting:fc,execed:fe},why:{consulting:wc,execed:we}});
const p=(name,role,unit,src,rel,li,lens,why,approach)=>({name,role,unit,src,rel,li,lens,why,approach});
const peer=(name,rev,emp,op,growth,ai,note)=>({name,rev,emp,op,growth,ai,note});
const rv=(name,type,strength,weak,how)=>({name,type,strength,weak,how});
const B='consulting',X='execed',BX=['consulting','execed'];

const COS=[
{id:'meridian',crm:'meridian',name:'Meridian Financial Group',sector:'Financial Services',sub:'Universal banking',hq:'Madrid, Spain',countries:'Spain, UK, Portugal, Mexico +2',founded:1962,listed:true,exchange:'Bolsa de Madrid · MFG',web:'meridianfg.example',li:'meridian-financial-group',liFollowers:'84k',ai:'Developing',
 employees:18400,revenue:9600,net:2150,op:34,growth:6.1,ldReported:990,
 desc:'Spanish universal bank with retail, corporate and wealth franchises in Spain, the UK and Latin America — midway through an efficiency and digital programme to 2027.',
 ar:{year:2025,pages:'312 pp.',kpis:[['Revenue','€9.6B','+6.1% YoY'],['Net profit','€2.15B','+4.0% YoY'],['Cost-to-income','47%','Target 42% by 2027'],['Digital investment','€640M','+18% YoY'],['Training investment','€18.2M','€990 per employee'],['Training hours','38 h','per employee / year']],
  priorities:[['Cost-to-income to 42% by 2027','Efficiency through AI-enabled customer operations','p. 14'],['Scale AI across customer service','Operating-model redesign + governance','p. 22'],['Grow UK SME banking','Sales-model and relationship-manager capability','p. 31']],
  talent:['Leadership programme for 600 senior managers launching 2026 (p. 88)','4,000 employees to be reskilled for digital roles by 2027 (p. 91)','Business-school partnership “under review” (p. 92)'],
  risks:['AI model-risk regulation','Net interest margin compression','Retention of technology talent']},
 bus:[bu('Retail Banking',52,9800,'High','Service cost pressure; complaints +14% YoY → AI customer operations','Medium','Branch-network leaders need change-leadership skills'),
  bu('Corporate & SME Banking',24,3100,'Medium','UK SME growth plan needs a new coverage model','High','Relationship managers shifting to advisory selling'),
  bu('Wealth & Insurance',14,2200,'Low','Recently restructured — low appetite for change','Medium','Adviser certification and client-advisory skills'),
  bu('Operations & Technology',10,3300,'High','Owns the €640M digital budget and AI roadmap','High','4,000-person reskilling plan; AI fluency for managers')],
 peers:[peer('Banco Arelia',11200,21000,31,4.2,'Advanced','AI service programme launched Q3 2026'),peer('Castellana Bank',7400,15200,29,3.1,'Developing','Cost-to-income 51%'),peer('Unity Bank UK',8100,16900,27,5.0,'Advanced','Strong digital SME proposition')],
 rivals:{consulting:[rv('Northwind Advisory','Global consultancy','Acquired an AI contact-centre boutique (Oct 2026)','Thin operating-model and capability-building track record','Lead with capability transfer and outcome-linked fees'),rv('Contact-centre platform vendors','Technology vendor','Bundle AI agents with licences; low entry price','Technology without process or people change','Position as vendor-neutral integrator')],
  execed:[rv('Larraz Business School','Business school · Madrid','Brand and alumni already inside Meridian','Generic open programmes; little AI-transformation content','Custom programme tied to live transformation projects'),rv('Digital learning platforms','E-learning provider','Scale and low cost per learner','Low completion; no senior-leadership depth','Blend: platform for reach, faculty for senior cohort')]},
 people:[p('Alberto Sanz','Chief Executive Officer','Group','Public profile','No contact','alberto-sanz-mfg',BX,'Owns the 2027 efficiency targets; public sponsor of the AI agenda','Via Elena Vidal — executive sponsor letter after first meeting'),
  p('Elena Vidal','Chief Operating Officer','Operations','CRM','Strong','elena-vidal',[B],'Sponsor of the cost-to-serve programme','Lead the meeting; anchor on cost-to-income'),
  p('Carmen Ruiz','Chief People Officer','People & Culture','Public profile','No contact','carmen-ruiz-people',[X],'Owns the 600-manager leadership programme and reskilling plan','Intro via Elena Vidal; position capability building'),
  p('Lucía Ferrer','Head of Leadership Development','People & Culture','Public profile','No contact','lucia-ferrer-ld',[X],'Runs the business-school partnership review (AR p. 92)','Share an AI-leadership programme outline'),
  p('Inés Navarro','Head of Customer Service','Retail Banking','CRM','Strong','ines-navarro',[B],'Champion; owns complaint and volume data','Co-design workshop on priority journeys'),
  p('Marcus Hale','Chief Information Officer','Operations & Technology','CRM','Developing','marcus-hale-cio',BX,'Platform owner; €640M digital budget; AI governance','Architecture session with a governance expert'),
  p('Robert Lang','Procurement Director','Finance','CRM','No contact','robert-lang',BX,'Evaluator; manages the advisory vendor panel','Register early on the panel')],
 hooks:{consulting:[['Reach the 42% cost-to-income target','AR 2025: 47% today, 42% committed by 2027'],['AI in customer operations without regulatory risk','Signals S1 + S2; CIO governance concern'],['Reskill 4,000 people alongside automation','AR 2025 p. 91']],
  execed:[['Design the 600-manager leadership programme','AR 2025 p. 88 — launching 2026'],['AI fluency for managers leading automation','Reskilling plan + digital roles strategy'],['Business-school partnership under review','AR 2025 p. 92 — window to be shortlisted']]},
 qs:{all:['Which 2027 targets matter most to the executive committee?','How is the efficiency programme’s success measured today?','Who else is involved in choosing external partners?','What has worked — and not — in previous transformation programmes?'],consulting:['Where do service costs concentrate: channels, intents or back office?'],execed:['How is the 600-manager programme being designed and sourced?']},
 signals:['s1','s9','s2'],
 sources:['Annual Report 2025 (demo document) — retrieved 28 Oct 2026','Company website meridianfg.example — 30 Oct 2026','LinkedIn company page — public data, 31 Oct 2026','Salesforce CRM — 4 contacts, 12 activities (permission-filtered)','Sector benchmarks — SYNERGON demo dataset 2025']},

{id:'valoria',crm:null,name:'Valoria Seguros',sector:'Insurance',sub:'Mutual insurer — motor, home, health',hq:'Madrid, Spain',countries:'Spain',founded:1971,listed:false,owner:'Mutual (member-owned)',web:'valoriaseguros.example',li:'valoria-seguros',liFollowers:'21k',ai:'Early',
 employees:4800,revenue:null,net:null,op:null,growth:null,
 desc:'Member-owned insurer with motor, home and health lines. No relationship yet — first meeting requested by the Chief Transformation Officer through the website.',
 bus:[bu('Motor',41,1500,'Medium','Claims automation and fraud analytics','Medium','Line managers in claims centres'),bu('Health',27,1100,'High','Fast-growing line; digital customer journeys','Medium','Clinical-network management skills'),bu('Home',22,700,'Low','Stable, low change appetite','Low','—'),bu('Claims & Operations (shared)',null,1500,'High','Largest cost pool; transformation office sits here','High','New transformation office needs leadership capability')],
 peers:[peer('Aurora Mutua',2600,6100,13,3.5,'Developing','Listed peer; digital claims launched 2025'),peer('Seguros Halcón',1500,3900,11,2.8,'Early','Regional competitor')],
 rivals:{consulting:[rv('Big Four advisory','Audit & advisory','Existing audit relationship','Independence limits on transformation work','Offer independence and delivery depth'),rv('Insurtech platforms','Technology vendor','Packaged claims automation','Narrow scope','Frame as operating-model change, platform-agnostic')],
  execed:[rv('Local business schools','Business school','Open programmes, alumni ties','Limited sector customisation','Insurance-specific transformation curriculum'),rv('Industry association training','Sector body','Low cost, regulatory focus','Compliance-led, not leadership-led','Position on leadership and change capability')]},
 people:[p('Nuria Campos','Chief Transformation Officer','Transformation Office','Public profile','Inbound lead','nuria-campos-cto',BX,'Requested the meeting; owns the 2026–28 transformation plan','Lead the meeting; ask for her top three priorities'),
  p('Pablo Ortega','Chief Executive Officer','Group','Public profile','No contact','pablo-ortega-valoria',BX,'Set a “digital mutual” vision in 2026 press interviews','Follow-up after a successful first meeting'),
  p('Jordi Puig','Chief Human Resources Officer','People','Public profile','No contact','jordi-puig-hr',[X],'Launched an internal academy in 2025','Explore the academy’s leadership track'),
  p('Sara León','Head of Claims','Claims & Operations','Public profile','No contact','sara-leon-claims',[B],'Largest operational budget; automation pilots underway','Benchmark session on claims operating models'),
  p('Miguel Torres','Chief Financial Officer','Finance','Public profile','No contact','miguel-torres-cfo',[B],'Solvency and cost targets; signs off investment','Bring a value hypothesis early')],
 hooks:{consulting:[['Cost and speed in claims','Claims & Operations is the largest cost pool (estimate)'],['Build a transformation office that delivers','CTO role created in 2026 (LinkedIn)'],['Digital health journeys','Health is the fastest-growing line (press)']],
  execed:[['Leadership capability for the transformation office','New CTO role and team (LinkedIn)'],['Leadership track for the internal academy','CHRO launched academy in 2025'],['Change leadership for claims-centre managers','Automation pilots will change frontline roles']]},
 qs:{all:['What triggered the transformation plan now?','What does success look like in 2028?','How are decisions on external partners made in a mutual?','What capabilities do you want to build in-house?'],consulting:['Where are the biggest cost and service gaps in claims?'],execed:['How many leaders will the transformation touch, and at what levels?']},
 signals:[],
 sources:['No annual report — private mutual; registry accounts not yet filed for 2025','Company website valoriaseguros.example — 31 Oct 2026','LinkedIn company page and public profiles — 31 Oct 2026','Inbound web form — 29 Oct 2026','Sector benchmarks — SYNERGON demo dataset 2025 (insurance)']},

{id:'horizon',crm:'horizon',name:'Horizon Telecom',sector:'Telecommunications',sub:'Integrated operator',hq:'Dubai, UAE',countries:'UAE, Oman, Bahrain',founded:1998,listed:true,exchange:'Dubai Financial Market · HZT',web:'horizontelecom.example',li:'horizon-telecom',liFollowers:'112k',ai:'Developing',
 employees:9200,revenue:5200,net:640,op:24,growth:3.2,ldReported:1150,
 desc:'Integrated mobile, fixed and enterprise operator consolidating three customer-care platforms ahead of a June 2027 contract break.',
 ar:{year:2025,pages:'198 pp.',kpis:[['Revenue','€5.2B','+3.2% YoY'],['Net profit','€640M','−2.1% YoY'],['Monthly churn','1.9%','up from 1.7%'],['Capex','€1.1B','21% of revenue'],['Training investment','€10.6M','€1,150 per employee'],['Emiratisation','46%','Target 55% by 2028']],
  priorities:[['Consolidate three care platforms by June 2027','Care redesign with AI-assisted routing','p. 18'],['Reduce churn by 2 points','Predictive retention programme','p. 24'],['Emiratisation 55% by 2028','National-talent leadership academy','p. 61']],
  talent:['National leadership academy expanding to 300 participants (p. 64)','Digital skills for 2,500 frontline staff (p. 66)'],
  risks:['Price competition from digital challengers','Platform migration risk','Localisation requirements']},
 bus:[bu('Consumer Mobile',48,3900,'High','Churn up 2 pts; care consolidation','Medium','Retail-store leadership'),bu('Home & Fixed',22,1800,'Medium','Fibre rollout operations','Low','—'),bu('Enterprise & Government',21,1700,'Medium','Solution-selling to government','High','Account leaders moving to solution selling'),bu('Digital Services',9,600,'Low','Small, already agile','Medium','Product-leadership skills')],
 peers:[peer('Gulfline Telecom',7800,12000,27,2.4,'Advanced','AI care launched 2025'),peer('Nexa Mobile',2100,3100,18,8.5,'Developing','Digital-only challenger')],
 rivals:{consulting:[rv('Northwind Advisory','Global consultancy','Telecom care references','Technology-led','Outcome-based model tied to churn'),rv('Veltrix Consulting','Regional consultancy','Local presence in Dubai','Limited telecom depth','Bring the validated AI contact-centre playbook')],
  execed:[rv('Gulf Leadership Institute','Executive education · Dubai','Government-backed, Emiratisation focus','Generic leadership content','Telecom-specific, project-based academy')]},
 people:[p('Khalid Mansour','Chief Customer Officer','Consumer','CRM','Developing','khalid-mansour',[B],'Owns churn and care consolidation','Tender pre-briefing'),p('Rania Aziz','Director, Customer Care','Consumer','CRM','Strong','rania-aziz',[B],'Champion; care KPIs','Co-design care journeys'),p('Huda Al Marri','Chief Human Capital Officer','People','Public profile','No contact','huda-almarri',[X],'Leads Emiratisation and academy expansion','Propose a national-talent leadership track'),p('Omar Siddiqui','Chief Executive Officer','Group','Public profile','No contact','omar-siddiqui-ceo',BX,'Public commitment to churn reduction','Via Khalid Mansour')],
 hooks:{consulting:[['Consolidate care without customer disruption','AR: 3 platforms → 1 by June 2027'],['Cut churn by 2 points','AR: churn 1.9% monthly and rising']],execed:[['Scale the national leadership academy to 300','AR p. 64'],['Solution-selling capability for Enterprise & Government','Strategy shift in AR']]},
 qs:{all:['How will the care tender be evaluated?','Which churn drivers matter most?','What is the timeline to decision?'],consulting:['What does the target care architecture look like?'],execed:['How is the academy curriculum designed today?']},
 signals:['s3','s4'],
 sources:['Annual Report 2025 (demo document)','Investor call Q3 2026 (demo)','LinkedIn company page','Salesforce CRM (permission-filtered)']},

{id:'crescent',crm:'crescent',name:'Crescent Retail Group',sector:'Retail',sub:'Multi-format retail',hq:'Dubai, UAE',countries:'UAE, Saudi Arabia',founded:1984,listed:false,owner:'Family-owned',web:'crescentretail.example',li:'crescent-retail-group',liFollowers:'46k',ai:'Early',
 employees:31000,revenue:null,net:null,op:null,growth:null,
 desc:'Family-owned grocery, fashion and e-commerce group across the UAE and Saudi Arabia, with seasonal service peaks now visible at board level.',
 bus:[bu('Grocery',55,17000,'Medium','Store operations efficiency','Medium','Store-manager leadership at scale'),bu('Fashion & Lifestyle',25,7500,'Low','Brand-led, low change appetite','Medium','Merchandising leadership'),bu('E-commerce',12,2100,'High','Peak backlog +30%; AI-assisted service','High','Digital leadership for a fast-growing unit'),bu('Logistics & Supply Chain',8,4400,'Medium','Peak-season fulfilment','Low','—')],
 peers:[peer('Al Noor Hypermarkets',6200,38000,6,5,'Developing','Listed peer'),peer('Souq Avenue Group',3100,14000,8,9,'Advanced','E-commerce leader in KSA')],
 rivals:{consulting:[rv('Veltrix Consulting','Regional consultancy','Launched retail AI practice in Dubai (Oct 2026)','New team, few references','Accelerate a pilot before Ramadan peak')],execed:[rv('Regional business schools','Business school','Family-business programmes','Limited digital-retail content','Next-generation family leadership + digital track')]},
 people:[p('Layla Haddad','Chief Digital Officer','Group','CRM','Developing','layla-haddad-cdo',BX,'Sponsor for AI-assisted service','Pilot proposal'),p('Samir Qureshi','Head of E-commerce Operations','E-commerce','CRM','Developing','samir-qureshi',[B],'Owns peak backlog data','Quantify backlog cost'),p('Yusuf Rahimi','Group Chief Executive','Group','Public profile','No contact','yusuf-rahimi',BX,'Second-generation family CEO','Via Layla Haddad'),p('Mariam Khoury','Group HR Director','People','Public profile','No contact','mariam-khoury-hr',[X],'Store-manager development across 400 stores','Store-leadership academy idea')],
 hooks:{consulting:[['Absorb peaks without temporary hiring','CDO: backlog +30% (CRM)'],['Respond to a new competitor','Veltrix retail AI practice (S7)']],execed:[['Store-manager leadership at scale','~620 store and area managers (estimate)'],['Next-generation family leadership','Family-owned succession context']]},
 qs:{all:['How are peak seasons handled today?','Who decides on group-wide programmes in the family structure?','What growth is planned in Saudi Arabia?'],consulting:['What does a backlog day cost?'],execed:['How are store managers developed today?']},
 signals:['s7'],
 sources:['No annual report — private, family-owned','Company website and press (demo)','LinkedIn company page','Salesforce CRM (permission-filtered)','Sector benchmarks — retail']},

{id:'northstar',crm:'northstar',name:'Northstar Industries',sector:'Industrial Manufacturing',sub:'Engineered components',hq:'Birmingham, UK',countries:'UK, Germany, Poland',founded:1931,listed:true,exchange:'London Stock Exchange · NSI',web:'northstarindustries.example',li:'northstar-industries',liFollowers:'38k',ai:'Developing',
 employees:12700,revenue:4800,net:290,op:10.5,growth:4.4,ldReported:640,
 desc:'Engineered-components manufacturer scaling predictive maintenance from one plant to six after a successful pilot.',
 ar:{year:2025,pages:'176 pp.',kpis:[['Revenue','€4.8B','+4.4% YoY'],['Net profit','€290M','+7% YoY'],['Unplanned downtime','6.2%','Target 4.5%'],['Training investment','€8.1M','€640 per employee']],
  priorities:[['Scale predictive maintenance to 6 plants','Programme delivery + crew reskilling','p. 12'],['Reduce unplanned downtime to 4.5%','Operations excellence','p. 15']],
  talent:['Maintenance-crew reskilling for 1,200 technicians (p. 54)','Plant-manager leadership programme (p. 56)'],risks:['Skills shortage in maintenance engineering','Energy costs']},
 bus:[bu('Aerospace Components',38,4600,'Medium','Quality and traceability','Medium','Engineering leadership'),bu('Industrial Systems',34,4200,'High','Predictive maintenance scale-up','High','Plant-manager leadership'),bu('Aftermarket Services',18,2300,'High','Service-model growth','Medium','Service-sales capability'),bu('Group Engineering',10,1600,'Low','—','Low','—')],
 peers:[peer('Kessler Werke',6100,15800,12,3.0,'Advanced','German peer')],
 rivals:{consulting:[rv('Industrial IoT vendors','Technology vendor','Sensor platforms','Weak on adoption','Lead with crew reskilling and adoption')],execed:[rv('Midlands Business School','Business school','Local alumni','Generic content','Plant-leadership programme on live scale-up')]},
 people:[p('Grace Whitfield','Chief Operating Officer','Group','CRM','Strong','grace-whitfield',BX,'Sponsor of scale-up','Scale-up steering'),p('Ian Brooks','Head of Engineering','Industrial Systems','CRM','Strong','ian-brooks-eng',[B],'Champion','Technical workshop'),p('Helen Price','Group HR Director','People','Public profile','No contact','helen-price-hr',[X],'Owns the reskilling plan','Propose a capability workstream')],
 hooks:{consulting:[['Scale predictive maintenance to 6 plants','AR p. 12; board funding approved']],execed:[['Plant-manager leadership for the scale-up','AR p. 56']]},
 qs:{all:['What slowed the pilot?','Which plants go first?'],consulting:['How will value be tracked per plant?'],execed:['How many plant managers are in scope?']},
 signals:['s8'],sources:['Annual Report 2025 (demo document)','LinkedIn company page','Salesforce CRM (permission-filtered)']},

{id:'atlas',crm:'atlas',name:'Atlas Energy',sector:'Energy',sub:'Integrated energy',hq:'Riyadh, Saudi Arabia',countries:'Saudi Arabia, UAE',founded:1976,listed:true,exchange:'Tadawul · ATLE',web:'atlasenergy.example',li:'atlas-energy',liFollowers:'205k',ai:'Developing',
 employees:22000,revenue:11800,net:1900,op:26,growth:7.2,ldReported:null,
 desc:'Integrated energy group with a board mandate to reskill 3,000 field staff for digital operations by 2028.',
 ar:{year:2025,pages:'240 pp.',kpis:[['Revenue','€11.8B','+7.2% YoY'],['Net profit','€1.9B','+5% YoY'],['Renewables capacity','2.4 GW','Target 6 GW by 2030'],['Saudisation','78%','Target 85%']],
  priorities:[['Reskill 3,000 field staff by 2028','Capability academy','p. 40'],['Digital twins across grid assets','Operations transformation','p. 28']],
  talent:['Corporate academy to open 2027 (p. 44)'],risks:['Commodity price volatility','Skills availability']},
 bus:[bu('Upstream Operations',40,8800,'Medium','Digital operations','High','Field leadership for digital ops'),bu('Power Generation',30,6600,'High','Digital twins','Medium','Plant leadership'),bu('Renewables',15,3300,'Medium','Rapid scale-up','High','New-business leadership'),bu('Corporate Functions',15,3300,'Low','—','Medium','Executive committee development')],
 peers:[peer('Najd Power',8400,17000,24,6.0,'Developing','Utility peer')],
 rivals:{consulting:[rv('Global strategy firms','Consultancy','Board access','High cost','Capability-led delivery')],execed:[rv('International business schools','Business school','Brand','Limited localisation','Arabic-English blended academy')]},
 people:[p('Faisal Al-Otaibi','Chief Human Capital Officer','Group','CRM','Strong','faisal-alotaibi',BX,'Sponsor of reskilling','Programme design workshop')],
 hooks:{consulting:[['Digital twins with workforce adoption','AR p. 28']],execed:[['Corporate academy opening 2027','AR p. 44']]},
 qs:{all:['What does the academy need to deliver in year one?'],consulting:['Which assets go first?'],execed:['Which leadership levels are in scope?']},
 signals:['s5','s6'],sources:['Annual Report 2025 (demo document)','LinkedIn company page','Salesforce CRM (permission-filtered)']}];

function analyse(co,ov){ov=ov||{};const b=BENCH[co.sector],emp=co.employees;
 const revEst=co.revenue==null,rev=revEst?emp*b.revPerEmp:co.revenue;
 const netEst=co.net==null,net=netEst?rev*b.net/100:co.net;
 const opEst=co.op==null,op=opEst?b.op:co.op;
 const ldPer=ov.ld!=null?ov.ld:(co.ldReported||b.ld);
 const ldSrc=ov.ld!=null?'Your adjustment':co.ldReported?'Reported in annual report':'Sector benchmark';
 const execShare=ov.exec!=null?ov.exec:b.execShare;
 const ldTotal=emp*ldPer,execBudget=ldTotal*execShare;
 return {B:b,rev,revEst,revLo:rev*.8,revHi:rev*1.2,net,netEst,netLo:net*.7,netHi:net*1.3,op,opEst,growth:co.growth,ldPer,ldSrc,execShare,ldTotal,execBudget,leaders:Math.round(emp*b.leader),external:execBudget*.55,wallet:rev*1e6*b.consPct,
  confidence:co.listed?'High — reported figures':co.custom?'Low — sector model only':'Medium — estimated ±20%'};}

function generic(name,sector,emp,country){const b=BENCH[sector],slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'');const sh=[.45,.25,.18,.12];
 return {id:'custom-'+Date.now(),custom:true,crm:null,name,sector,sub:'',hq:country,countries:country,founded:null,listed:false,owner:'private (assumed)',web:slug+'.example',li:slug,liFollowers:null,ai:'—',employees:emp,revenue:null,net:null,op:null,growth:null,
  desc:'New company analysed with the Radar360 sector model. No annual report or CRM record found — every figure is an estimate to validate in the first meeting.',
  bus:b.bus.map((n,i)=>bu(n,null,Math.round(emp*sh[i]),i===0||i===2?'High':'Medium','Typical transformation focus in '+sector.toLowerCase(),i===0?'High':'Medium','Typical leadership-development population')),
  peers:[],rivals:{consulting:[rv('Global consultancies','Consulting','Brand and scale','Generic approaches, high cost','Lead with sector-specific evidence')],execed:[rv('Local business schools','Business school','Open programmes, alumni ties','Limited customisation','Custom, in-work programmes')]},
  people:[['Chief Executive Officer',BX],['Chief Operating Officer',[B]],['Chief People Officer / CHRO',[X]],['Head of Learning & Development',[X]],['Chief Financial Officer',[B]],['Chief Digital / Information Officer',[B]]].map(([r,l])=>p('To be identified',r,'—','Role template','No contact',null,l,'Typical decision role for this offering','Find the current holder on LinkedIn')),
  hooks:{consulting:[['Efficiency and growth in '+b.bus[0].toLowerCase(),'Sector pattern — validate'],['Digital and AI adoption','Sector pattern — validate']],execed:[['Leadership development for ≈'+Math.round(emp*b.leader)+' leaders','Estimated leadership population'],['AI fluency for managers','Sector pattern — validate']]},
  qs:{all:['What are your top three priorities for the next 24 months?','How are external partners selected?','Which capabilities do you want to build in-house?'],consulting:['Where are the largest cost or growth gaps?'],execed:['How is leadership development organised today?']},
  signals:[],sources:['Sector benchmarks — SYNERGON demo dataset 2025 ('+sector.toLowerCase()+')','User input: name, sector, headcount, country']};}

return {BENCH,LENS,COS,analyse,generic};
})();
