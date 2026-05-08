import { useState, useEffect, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════════════
   DEFRA MULTI-AGENT PLANNING TRIAGE SYSTEM
   GDS-compliant GOV.UK Design System styling
   ═══════════════════════════════════════════════════ */

// ── GOV.UK COLOUR PALETTE ───────────────────
const G = {
  black: "#0b0c0c",
  darkGrey: "#505a5f",
  midGrey: "#b1b4b6",
  lightGrey: "#f3f2f1",
  white: "#ffffff",
  blue: "#1d70b8",
  darkBlue: "#003078",
  lightBlue: "#5694ca",
  red: "#d4351c",
  yellow: "#ffdd00",
  green: "#00703c",
  purple: "#4c2c92",
  orange: "#f47738",
  pink: "#d53880",
  lightGreen: "#85994b",
  turquoise: "#28a197",
  // Functional
  link: "#1d70b8",
  linkHover: "#003078",
  focus: "#ffdd00",
  error: "#d4351c",
  brand: "#1d70b8",
  // Defra brand
  defra: "#00a33b",
  // Tag tints (GDS tag component patterns)
  tagGrey: { bg: "#eff0f1", text: "#383f43" },
  tagGreen: { bg: "#cce2d8", text: "#005a30" },
  tagTurquoise: { bg: "#bfe3e0", text: "#10403c" },
  tagBlue: { bg: "#d2e2f1", text: "#144e81" },
  tagPurple: { bg: "#dbd5e9", text: "#3d2375" },
  tagPink: { bg: "#f7d7e6", text: "#80224d" },
  tagRed: { bg: "#f6d7d2", text: "#942514" },
  tagOrange: { bg: "#fcd6c3", text: "#6e3619" },
  tagYellow: { bg: "#fff7bf", text: "#594d00" },
};

// ── DATA ────────────────────────────────────

const KB = [
  { id: "KB-001", topic: "Flood Risk Assessment", category: "Water", body: "Development in Flood Zone 3 requires a site-specific flood risk assessment demonstrating the development will be safe for its lifetime, taking climate change into account. The sequential test must be applied, and where necessary the exception test, in line with NPPF paragraphs 159\u2013169.", tags: ["flood", "FRA", "sequential test", "FZ3"] },
  { id: "KB-002", topic: "Water Discharge Permits", category: "Water", body: "Any discharge of trade effluent or sewage effluent to controlled waters requires an environmental permit under the Environmental Permitting Regulations 2016. Standard rules permits are available for lower-risk discharges.", tags: ["discharge", "permit", "EPR 2016"] },
  { id: "KB-003", topic: "Great Crested Newts", category: "Ecology", body: "Where great crested newts are known or likely to be present, a district level licensing scheme may apply. Developers should check Natural England\u2019s licensing portal before submitting planning applications.", tags: ["GCN", "newts", "protected species", "DLL"] },
  { id: "KB-004", topic: "SSSI Impact Assessment", category: "Ecology", body: "Operations likely to damage a Site of Special Scientific Interest require consent from Natural England under the Wildlife and Countryside Act 1981 (as amended). An appropriate assessment may also be needed under the Habitats Regulations.", tags: ["SSSI", "habitats", "W&C Act"] },
  { id: "KB-005", topic: "Air Quality and IED", category: "Air", body: "Installations regulated under the Industrial Emissions Directive must demonstrate Best Available Techniques (BAT) for emission control. BAT conclusions are legally binding and set emission limit values.", tags: ["air quality", "IED", "BAT", "emissions"] },
  { id: "KB-006", topic: "Waste Operations", category: "Waste", body: "Waste operations require an environmental permit unless exempt. Standard rules permits cover lower-risk activities. Operators must demonstrate technical competence and financial provision.", tags: ["waste", "permit", "exemption"] },
  { id: "KB-007", topic: "Groundwater Protection", category: "Water", body: "The EA applies Source Protection Zone policies. Activities within SPZ1 are subject to strict controls to prevent contamination of drinking water sources. Position statements guide specific activities.", tags: ["groundwater", "SPZ", "contamination"] },
  { id: "KB-008", topic: "Nutrient Neutrality", category: "Ecology", body: "In nutrient-sensitive catchments, new residential development must demonstrate nutrient neutrality through mitigation credits or on-site measures. Natural England advises affected local planning authorities.", tags: ["nutrients", "neutrality", "phosphate", "nitrate"] },
  { id: "KB-009", topic: "Biodiversity Net Gain", category: "Ecology", body: "From February 2024, most developments must deliver a minimum 10% biodiversity net gain. This can be achieved on-site, off-site, or through statutory credits. A 30-year management plan is required.", tags: ["BNG", "biodiversity", "10%", "metric"] },
  { id: "KB-010", topic: "Coastal Erosion", category: "Water", body: "Development proposals in areas at risk of coastal erosion should be assessed against the relevant Shoreline Management Plan. The EA advises against development in areas at risk within the next 100 years.", tags: ["coastal", "erosion", "SMP", "shoreline"] },
];

const LAS = ["Bath & North East Somerset","Birmingham City","Bristol City","Buckinghamshire","Cambridge City","Canterbury City","Chelmsford City","Cornwall","Devon County","Dorset","East Suffolk","Exeter City","Gloucestershire","Hampshire County","Herefordshire","Kent County","Lancaster City","Leeds City","Lincoln City","Manchester City","Norfolk County","Northumberland","Nottingham City","Oxford City","Plymouth City","Reading Borough","Sheffield City","Somerset","Surrey County","Wiltshire","West Berkshire","South Gloucestershire","North Somerset","Swindon Borough","Torbay","Bournemouth"];
const TYPES = ["Pre-application Advice","Permit Consultation","EIA Screening","Habitat Assessment","Flood Risk Review","Discharge Consent"];
const RISKS = ["Low","Medium","High","Critical"];
const BODIES = ["Environment Agency","Natural England","Both EA & NE"];
const STATUSES = ["Pending Triage","In Review","Auto-Responded","Escalated","Completed"];

const AGENTS = [
  { id: "intake", name: "Intake Agent", role: "Receives, parses, and normalises incoming consultation requests. Extracts key fields: site location, development type, flood zone, ecology flags." },
  { id: "classify", name: "Classification Agent", role: "Assesses risk level based on site sensitivity, development scale, and topic overlap. Flags multi-issue requests for compound review." },
  { id: "route", name: "Routing Agent", role: "Determines if request is in-remit for EA/NE. Matches to knowledge base articles. Decides path: auto-respond, queue for review, or escalate." },
  { id: "rag", name: "RAG / MCP Agent", role: "Retrieves relevant policy paragraphs, standing advice, precedent cases, and template responses from the knowledge base using semantic search." },
  { id: "response", name: "Response Agent", role: "Drafts consultation response using retrieved context, site-specific details, and approved response templates." },
  { id: "qa", name: "QA Agent", role: "Validates response against policy, checks for completeness, scores confidence. Approves auto-send for high-confidence low-risk responses." },
  { id: "briefing", name: "Briefing Agent", role: "For escalated cases: compiles officer briefing packs with risk summary, precedent analysis, recommended approach, and draft response for review." },
];

const CAPS = {
  intake: ["Parse free-text consultation requests from 350+ local planning authorities","Extract structured fields: site location, development type, dwelling count, flood zone","Normalise inconsistent formats into standardised internal schema","Flag missing required fields and request clarification"],
  classify: ["Assess risk across four levels: Low, Medium, High, Critical","Identify topic categories: Water, Ecology, Air, Waste, Land","Detect multi-issue requests requiring compound assessment","Apply sensitivity scoring based on site designations (SSSI, SAC, SPA, Ramsar)"],
  route: ["Determine statutory consultee remit for EA and/or Natural England","Match requests to knowledge base articles using topic classification","Route low-risk standard queries to auto-response pipeline","Escalate high-complexity cases with pre-loaded officer context","Redirect out-of-remit requests with signposting to correct body"],
  rag: ["Semantic search across 10+ policy document categories","Retrieve standing advice paragraphs with citation references","Cross-reference precedent cases from similar site types","Compile context packages with confidence scoring per source"],
  response: ["Draft consultation responses using retrieved policy context","Incorporate site-specific details from the original request","Apply approved response templates for standard advice categories","Generate responses ranging from 150\u2013400 words based on complexity"],
  qa: ["Validate response against current policy and standing advice","Score confidence level (threshold: 90% for auto-dispatch)","Check tone, completeness, and regulatory citation accuracy","Gate auto-send decisions \u2014 below threshold routes to officer review"],
  briefing: ["Compile officer briefing packs for escalated/complex cases","Summarise risk factors and site sensitivity analysis","Include precedent case summaries with outcome references","Provide draft response skeleton for officer review and editing"],
};

function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function buildRequests(n) {
  const r = rng(42); const now = Date.now(); const out = [];
  for (let i = 0; i < n; i++) {
    const risk = RISKS[Math.floor(r() * 4)];
    const type = TYPES[Math.floor(r() * TYPES.length)];
    const body = BODIES[Math.floor(r() * BODIES.length)];
    const la = LAS[Math.floor(r() * LAS.length)];
    const days = Math.floor(r() * 45);
    const oor = r() < 0.14;
    const autoLow = risk === "Low" && !oor && r() < 0.72;
    let status;
    if (oor) status = "Auto-Responded";
    else if (autoLow) status = "Auto-Responded";
    else if (risk === "Critical") status = "Escalated";
    else if (risk === "High") status = r() < 0.5 ? "In Review" : "Escalated";
    else status = r() < 0.35 ? "Completed" : r() < 0.55 ? "In Review" : "Pending Triage";
    const kb = KB[Math.floor(r() * KB.length)];
    const descs = {
      "Pre-application Advice": [`${la} seeks pre-application advice for a proposed mixed-use development near a watercourse. The site is partially within Flood Zone 2 with potential habitat for protected species on the eastern boundary.`,`Pre-application enquiry from ${la} regarding a residential scheme of ${Math.floor(r()*200)+20} dwellings on greenfield land. The site borders a Local Wildlife Site and is within a nutrient-sensitive catchment.`],
      "Permit Consultation": [`Consultation from ${la} on a new industrial installation seeking an environmental permit for waste treatment operations within 500m of residential receptors.`,`${la} forwards permit consultation for a new biomass energy plant. Stack emissions modelling required under IED regulations.`],
      "EIA Screening": [`EIA screening opinion requested by ${la} for a solar farm of ${Math.floor(r()*60)+15} hectares on agricultural land adjacent to a designated SSSI.`,`${la} requests EIA screening for a quarry extension within Source Protection Zone 2 overlapping ancient woodland.`],
      "Habitat Assessment": [`${la} requests habitat assessment review for development within a nutrient-sensitive catchment requiring nutrient neutrality demonstration.`,`Habitat Regulations Assessment screening from ${la} for a coastal development within the zone of influence of an SPA/SAC.`],
      "Flood Risk Review": [`Flood risk assessment review requested by ${la} for proposed commercial development in Flood Zone 3a. Sequential and exception test documentation provided.`,`${la} seeks EA review of an FRA for ${Math.floor(r()*100)+10} dwellings in Flood Zone 2.`],
      "Discharge Consent": [`${la} forwards application for new discharge consent for treated surface water runoff from a logistics park into a designated Main River.`,`Discharge consent consultation from ${la} for a new sewage treatment works serving ${Math.floor(r()*5000)+500} population equivalent.`],
    };
    const opts = descs[type] || [`Planning consultation from ${la}.`];
    const desc = opts[Math.floor(r() * opts.length)];
    const log = [];
    log.push({ agent: "Intake Agent", action: "Received and parsed incoming request. Extracted site coordinates, development type, flood zone designation, and ecology flags.", ts: "0.8s" });
    log.push({ agent: "Classification Agent", action: `Assessed risk level as ${risk}. ${risk === "Critical" ? "Multiple high-sensitivity overlaps detected." : "Standard assessment criteria applied."}`, ts: "1.9s" });
    if (oor) {
      log.push({ agent: "Routing Agent", action: "Identified as OUT OF REMIT. Not within EA/NE statutory consultee scope.", ts: "2.6s" });
      log.push({ agent: "Response Agent", action: "Generated standard out-of-remit response with signposting to correct body.", ts: "3.8s" });
      log.push({ agent: "QA Agent", action: "Validated against template. Policy compliance: PASS. Auto-dispatched.", ts: "4.3s" });
    } else if (autoLow) {
      log.push({ agent: "Routing Agent", action: `In-remit. Matched ${kb.id} (${kb.topic}). Low complexity \u2014 auto-response path.`, ts: "2.8s" });
      log.push({ agent: "RAG / MCP Agent", action: `Retrieved standing advice from ${kb.id}. Confidence: ${Math.floor(r()*8)+92}%.`, ts: "4.2s" });
      log.push({ agent: "Response Agent", action: `Drafted standard response. Word count: ${Math.floor(r()*200)+150}.`, ts: "5.4s" });
      log.push({ agent: "QA Agent", action: `Confidence: ${Math.floor(r()*6)+93}%. Policy: PASS. Auto-dispatching.`, ts: "6.1s" });
    } else if (risk === "Critical" || status === "Escalated") {
      log.push({ agent: "Routing Agent", action: "High complexity. Escalating to senior officer with pre-loaded context.", ts: "2.4s" });
      log.push({ agent: "RAG / MCP Agent", action: `Retrieved context from ${kb.id} and ${Math.floor(r()*5)+2} precedent cases.`, ts: "3.9s" });
      log.push({ agent: "Briefing Agent", action: `Compiled briefing pack: risk summary, ${Math.floor(r()*3)+2} precedent summaries, recommended approach.`, ts: "5.6s" });
    } else {
      log.push({ agent: "Routing Agent", action: `In-remit. Standard review queue. KB match: ${kb.id} (${kb.topic}).`, ts: "2.5s" });
      log.push({ agent: "RAG / MCP Agent", action: `Retrieved supporting policy context. ${Math.floor(r()*3)+2} documents identified.`, ts: "4.1s" });
    }
    const rt = (oor || autoLow) ? Math.floor(r()*6)+1 : risk === "Low" ? Math.floor(r()*12)+3 : null;
    const ref = `PA/${new Date(now - days*864e5).getFullYear()}/${String(i+1).padStart(5,"0")}`;
    out.push({ id: ref, la, type, body, risk, status, oor, date: new Date(now - days*864e5).toISOString().split("T")[0], sla: new Date(now - days*864e5 + 21*864e5).toISOString().split("T")[0], desc, kb, log, rt, dwellings: Math.floor(r()*300)+5, site: `${la} District` });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

const DATA = buildRequests(250);

// ── GDS STYLES ──────────────────────────────

const FONT = `"GDS Transport", Arial, sans-serif`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes su{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
`;

// ── GDS COMPONENTS ──────────────────────────

function Tag({ children, color = "blue" }) {
  const map = {
    grey: G.tagGrey, green: G.tagGreen, turquoise: G.tagTurquoise,
    blue: G.tagBlue, purple: G.tagPurple, pink: G.tagPink,
    red: G.tagRed, orange: G.tagOrange, yellow: G.tagYellow,
  };
  const t = map[color] || map.blue;
  return (
    <strong style={{
      display: "inline-block", padding: "2px 8px", fontFamily: FONT, fontSize: 14,
      fontWeight: 700, lineHeight: "1.25", textTransform: "uppercase",
      letterSpacing: "1px", color: t.text, background: t.bg,
    }}>{children}</strong>
  );
}

function RiskTag({ risk }) {
  const m = { Low: "green", Medium: "yellow", High: "orange", Critical: "red" };
  return <Tag color={m[risk] || "grey"}>{risk}</Tag>;
}

function StatusTag({ status }) {
  const m = { "Pending Triage": "yellow", "In Review": "blue", "Auto-Responded": "green", Escalated: "pink", Completed: "turquoise" };
  return <Tag color={m[status] || "grey"}>{status}</Tag>;
}

function GovPanel({ title, children, color = G.turquoise }) {
  return (
    <div style={{ borderLeft: `5px solid ${color}`, padding: "15px 20px", background: G.lightGrey, marginBottom: 20 }}>
      {title && <div style={{ fontSize: 16, fontWeight: 700, color: G.black, marginBottom: 8, fontFamily: FONT }}>{title}</div>}
      {children}
    </div>
  );
}

function StatPanel({ label, value, sub }) {
  return (
    <div style={{ padding: "15px 20px", background: G.lightGrey, borderTop: `3px solid ${G.black}` }}>
      <div style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: G.black, fontFamily: FONT, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── AGENT TRACE ─────────────────────────────

function Trace({ log, animated = false }) {
  const [vc, setVc] = useState(animated ? 0 : log.length);
  const ref = useRef(null);
  useEffect(() => {
    if (!animated) { setVc(log.length); return; }
    setVc(0); let s = 0;
    const tick = () => { s++; setVc(s); if (s < log.length) ref.current = setTimeout(tick, 900 + Math.random() * 600); };
    ref.current = setTimeout(tick, 600);
    return () => clearTimeout(ref.current);
  }, [log, animated]);

  return (
    <div>
      {log.slice(0, vc).map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 15, animation: animated ? "si 0.3s ease" : "none", marginBottom: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 28 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", border: `3px solid ${G.black}`,
              background: G.white, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: G.black, fontFamily: FONT, zIndex: 1,
            }}>{i + 1}</div>
            {i < log.length - 1 && <div style={{ width: 3, height: 30, background: G.midGrey }} />}
          </div>
          <div style={{ paddingBottom: i < log.length - 1 ? 12 : 0, flex: 1, paddingTop: 2 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: G.black, fontFamily: FONT }}>
              {e.agent}
              <span style={{ fontWeight: 400, color: G.darkGrey, fontSize: 14, marginLeft: 8 }}>{e.ts}</span>
            </div>
            <div style={{ fontSize: 16, color: G.darkGrey, marginTop: 4, lineHeight: 1.5, fontFamily: FONT }}>{e.action}</div>
          </div>
        </div>
      ))}
      {animated && vc < log.length && (
        <div style={{ display: "flex", gap: 15, alignItems: "center", padding: "8px 0" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${G.midGrey}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: G.blue, animation: "pulse 1s infinite" }} />
          </div>
          <span style={{ fontSize: 16, color: G.darkGrey, fontStyle: "italic", fontFamily: FONT }}>Processing\u2026</span>
        </div>
      )}
    </div>
  );
}

// ── SERVICE NAV ─────────────────────────────

function ServiceNav({ active, onNav }) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "requests", label: "Requests" },
    { id: "agents", label: "Agent architecture" },
    { id: "knowledge", label: "Knowledge base" },
    { id: "simulation", label: "Live simulation" },
  ];
  return (
    <div>
      {/* GOV.UK-style header bar */}
      <div style={{ background: G.black, padding: "10px 30px", display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="36" height="32" viewBox="0 0 36 32"><path d="M18 0L0 32h36L18 0z" fill={G.white} opacity="0.9"/></svg>
        <span style={{ color: G.white, fontFamily: FONT, fontSize: 18, fontWeight: 700, letterSpacing: "-0.2px" }}>GOV.UK</span>
      </div>
      {/* Service name + phase banner */}
      <div style={{ background: G.white, borderBottom: `1px solid ${G.midGrey}` }}>
        <div style={{ padding: "10px 30px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <Tag color="turquoise">Beta</Tag>
          <span style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT }}>
            This is a demo service, and will be improved after the consultation with DEFRA.
          </span>
        </div>
        <div style={{ padding: "15px 30px 0" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: 0, lineHeight: 1.2 }}>
            Defra Multi-Agent Triage System
          </h1>
          <div style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginTop: 4, marginBottom: 15 }}>
            Environment Agency and Natural England planning consultation service
          </div>
        </div>
        {/* Service navigation tabs */}
        <nav style={{ padding: "0 30px", display: "flex", gap: 0, borderTop: `1px solid ${G.midGrey}` }}>
          {items.map(it => {
            const on = active === it.id;
            return (
              <button key={it.id} onClick={() => onNav(it.id)} style={{
                padding: "12px 20px", border: "none", borderBottom: on ? `4px solid ${G.blue}` : "4px solid transparent",
                background: "transparent", fontFamily: FONT, fontSize: 16, fontWeight: on ? 700 : 400,
                color: on ? G.blue : G.black, cursor: "pointer", transition: "border-color 0.15s",
              }}>{it.label}</button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ── DASHBOARD PAGE ──────────────────────────

function DashboardPage({ data, onNav }) {
  const stats = useMemo(() => {
    const total = data.length;
    const auto = data.filter(r => r.status === "Auto-Responded").length;
    const oor = data.filter(r => r.oor).length;
    const esc = data.filter(r => r.status === "Escalated").length;
    const pending = data.filter(r => r.status === "Pending Triage").length;
    const avgRt = data.filter(r => r.rt).reduce((s, r) => s + r.rt, 0) / (data.filter(r => r.rt).length || 1);
    return { total, auto, oor, esc, pending, avgRt: avgRt.toFixed(1) };
  }, [data]);
  const autoRate = ((stats.auto / stats.total) * 100).toFixed(0);
  const riskData = RISKS.map(r => ({ lv: r, c: data.filter(d => d.risk === r).length }));
  const statusData = STATUSES.map(s => ({ st: s, c: data.filter(d => d.status === s).length }));
  const riskColors = { Low: G.green, Medium: "#b58840", High: G.orange, Critical: G.red };
  const statusColors = { "Pending Triage": "#b58840", "In Review": G.blue, "Auto-Responded": G.green, Escalated: G.pink, Completed: G.turquoise };
  const recent = data.slice(0, 6);

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 10px" }}>Overview</h2>
      <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 25, lineHeight: 1.5 }}>
        Performance summary for the multi-agent planning consultation triage system across the last 45 days.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 15, marginBottom: 30 }}>
        <StatPanel label="Total requests" value={stats.total} sub="Last 45 days" />
        <StatPanel label="Auto-responded" value={stats.auto} sub={`${autoRate}% automation rate`} />
        <StatPanel label="Out of remit" value={stats.oor} sub="Redirected automatically" />
        <StatPanel label="Escalated" value={stats.esc} sub="Officer review needed" />
        <StatPanel label="Avg. response time" value={`${stats.avgRt}m`} sub="Auto-responded cases" />
        <StatPanel label="Pending triage" value={stats.pending} sub="Awaiting processing" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginBottom: 30 }}>
        {/* Risk distribution */}
        <div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 15 }}>Risk distribution</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 100, padding: "0 10px" }}>
            {riskData.map(d => {
              const max = Math.max(...riskData.map(x => x.c));
              return (
                <div key={d.lv} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: G.black, fontFamily: FONT }}>{d.c}</span>
                  <div style={{ width: "100%", height: `${Math.max((d.c / max) * 70, 4)}px`, background: riskColors[d.lv], borderRadius: 0 }} />
                  <span style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT }}>{d.lv}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Status breakdown */}
        <div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 15 }}>Status breakdown</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 100, padding: "0 5px" }}>
            {statusData.map(d => {
              const max = Math.max(...statusData.map(x => x.c));
              return (
                <div key={d.st} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: G.black, fontFamily: FONT }}>{d.c}</span>
                  <div style={{ width: "100%", height: `${Math.max((d.c / max) * 70, 4)}px`, background: statusColors[d.st] }} />
                  <span style={{ fontSize: 11, color: G.darkGrey, fontFamily: FONT, textAlign: "center", lineHeight: 1.2 }}>{d.st}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT }}>Recent requests</h3>
        <a onClick={() => onNav("requests")} style={{ color: G.link, fontSize: 16, fontFamily: FONT, cursor: "pointer", textDecoration: "underline" }}>View all requests</a>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 16 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${G.black}` }}>
            {["Reference","Local authority","Type","Risk","Status","Date"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "10px 12px 10px 0", fontWeight: 700, color: G.black }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recent.map(r => (
            <tr key={r.id} onClick={() => onNav("requests")} style={{ borderBottom: `1px solid ${G.midGrey}`, cursor: "pointer" }}>
              <td style={{ padding: "10px 12px 10px 0" }}><a style={{ color: G.link }}>{r.id}</a></td>
              <td style={{ padding: "10px 12px 10px 0", color: G.black }}>{r.la}</td>
              <td style={{ padding: "10px 12px 10px 0", color: G.darkGrey }}>{r.type}</td>
              <td style={{ padding: "10px 12px 10px 0" }}><RiskTag risk={r.risk} /></td>
              <td style={{ padding: "10px 12px 10px 0" }}><StatusTag status={r.status} /></td>
              <td style={{ padding: "10px 12px 10px 0", color: G.darkGrey }}>{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── REQUESTS PAGE ───────────────────────────

function RequestsPage({ data }) {
  const [search, setSearch] = useState("");
  const [fS, setFS] = useState("All");
  const [fR, setFR] = useState("All");
  const [fB, setFB] = useState("All");
  const [sel, setSel] = useState(null);

  const filtered = useMemo(() => data.filter(r => {
    if (fS !== "All" && r.status !== fS) return false;
    if (fR !== "All" && r.risk !== fR) return false;
    if (fB !== "All" && r.body !== fB) return false;
    if (search && !r.id.toLowerCase().includes(search.toLowerCase()) && !r.la.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [data, search, fS, fR, fB]);

  const inputStyle = {
    padding: "8px 10px", border: `2px solid ${G.black}`, fontSize: 16,
    fontFamily: FONT, borderRadius: 0, outline: "none", background: G.white,
  };

  if (sel) return (
    <div style={{ animation: "fi 0.25s ease" }}>
      <a onClick={() => setSel(null)} style={{ color: G.link, fontSize: 16, fontFamily: FONT, cursor: "pointer", textDecoration: "underline", display: "inline-block", marginBottom: 20 }}>&larr; Back to requests</a>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 5px" }}>{sel.id}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 5, flexWrap: "wrap", alignItems: "center" }}>
        <RiskTag risk={sel.risk} /> <StatusTag status={sel.status} />
        {sel.oor && <Tag color="orange">Out of remit</Tag>}
      </div>
      <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 25 }}>
        {sel.la} &middot; {sel.type} &middot; {sel.body} &middot; Submitted {sel.date} &middot; SLA deadline {sel.sla}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        <div>
          {/* Request details */}
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 10 }}>Request details</h3>
          <div style={{ borderLeft: `5px solid ${G.midGrey}`, padding: "15px 20px", background: G.lightGrey, marginBottom: 20 }}>
            <p style={{ fontSize: 16, color: G.black, lineHeight: 1.6, fontFamily: FONT, margin: 0 }}>{sel.desc}</p>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Tag color="grey">{sel.dwellings} dwellings</Tag>
              <Tag color="grey">{sel.site}</Tag>
            </div>
          </div>

          {/* KB match */}
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 10 }}>Knowledge base match</h3>
          <div style={{ borderLeft: `5px solid ${G.green}`, padding: "15px 20px", background: "#e6f4ec", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontFamily: FONT, fontSize: 14, color: G.green }}>{sel.kb.id}</strong>
              <Tag color="green">{sel.kb.category}</Tag>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 8 }}>{sel.kb.topic}</div>
            <p style={{ fontSize: 16, color: G.black, lineHeight: 1.6, fontFamily: FONT, margin: "0 0 10px" }}>{sel.kb.body}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sel.kb.tags.map(t => <Tag key={t} color="grey">{t}</Tag>)}
            </div>
          </div>
          {sel.rt && (
            <GovPanel title={null} color={G.green}>
              <p style={{ fontSize: 16, fontWeight: 700, color: G.green, fontFamily: FONT, margin: 0 }}>Response generated in {sel.rt} minutes</p>
            </GovPanel>
          )}
        </div>

        {/* Agent trace */}
        <div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 15 }}>Multi-agent processing trace</h3>
          <Trace log={sel.log} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 10px" }}>All requests</h2>
      <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 20, lineHeight: 1.5 }}>
        Browse and inspect planning consultation requests processed by the multi-agent system.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 15, marginBottom: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: G.black, marginBottom: 4 }}>Search</label>
          <input type="text" placeholder="Reference or authority" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 220 }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: G.black, marginBottom: 4 }}>Status</label>
          <select value={fS} onChange={e => setFS(e.target.value)} style={{ ...inputStyle, minWidth: 160 }}>
            <option value="All">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: G.black, marginBottom: 4 }}>Risk</label>
          <select value={fR} onChange={e => setFR(e.target.value)} style={{ ...inputStyle, minWidth: 140 }}>
            <option value="All">All risks</option>{RISKS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: G.black, marginBottom: 4 }}>Target body</label>
          <select value={fB} onChange={e => setFB(e.target.value)} style={{ ...inputStyle, minWidth: 180 }}>
            <option value="All">All bodies</option>{BODIES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, paddingBottom: 10 }}>{filtered.length} results</div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: 16 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${G.black}` }}>
            {["Reference","Local authority","Type","Target body","Risk","Status","Date"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "10px 12px 10px 0", fontWeight: 700, color: G.black }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 50).map(r => (
            <tr key={r.id} onClick={() => setSel(r)} style={{ borderBottom: `1px solid ${G.midGrey}`, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = G.lightGrey}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "10px 12px 10px 0" }}><a style={{ color: G.link }}>{r.id}</a></td>
              <td style={{ padding: "10px 12px 10px 0", color: G.black }}>{r.la}</td>
              <td style={{ padding: "10px 12px 10px 0", color: G.darkGrey, fontSize: 14 }}>{r.type}</td>
              <td style={{ padding: "10px 12px 10px 0", color: G.darkGrey, fontSize: 14 }}>{r.body}</td>
              <td style={{ padding: "10px 12px 10px 0" }}><RiskTag risk={r.risk} /></td>
              <td style={{ padding: "10px 12px 10px 0" }}><StatusTag status={r.status} /></td>
              <td style={{ padding: "10px 12px 10px 0", color: G.darkGrey }}>{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 50 && <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginTop: 15 }}>Showing 50 of {filtered.length} results</p>}
    </div>
  );
}

// ── AGENTS PAGE ─────────────────────────────

function AgentsPage() {
  const [aa, setAa] = useState(null);
  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 10px" }}>Agent architecture</h2>
      <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 25, lineHeight: 1.5 }}>
        Seven specialised agents process planning consultation requests through a sequential pipeline. The Routing Agent is the key decision point that bridges triage (Use Case 2) with response generation (Use Case 1).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 30 }}>
        {/* Pipeline */}
        <div>
          {AGENTS.map((ag, i) => (
            <div key={ag.id}>
              <div onClick={() => setAa(aa === ag.id ? null : ag.id)} style={{
                padding: "12px 15px", border: `2px solid ${aa === ag.id ? G.blue : G.midGrey}`,
                background: aa === ag.id ? "#e8f0fe" : G.white, cursor: "pointer", marginBottom: 0,
                transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: G.black, fontFamily: FONT }}>
                  {i + 1}. {ag.name}
                </div>
                <div style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT, marginTop: 2 }}>{ag.id.toUpperCase()}</div>
              </div>
              {i < AGENTS.length - 1 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  {ag.id === "route" ? (
                    <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
                      <Tag color="orange">Out of remit</Tag>
                      <span style={{ color: G.darkGrey, fontFamily: FONT, fontSize: 14 }}>&darr;</span>
                      <Tag color="green">Auto-response</Tag>
                      <span style={{ color: G.darkGrey, fontFamily: FONT, fontSize: 14 }}>&darr;</span>
                      <Tag color="pink">Escalate</Tag>
                    </div>
                  ) : (
                    <div style={{ width: 3, height: 16, background: G.midGrey }} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div style={{ border: `1px solid ${G.midGrey}`, padding: 25, background: G.white, minHeight: 400 }}>
          {aa ? (() => {
            const ag = AGENTS.find(a => a.id === aa);
            const idx = AGENTS.indexOf(ag) + 1;
            return (
              <div style={{ animation: "fi 0.2s ease" }}>
                <span style={{ display: "inline-block", width: 36, height: 36, borderRadius: "50%", background: G.black, color: G.white, textAlign: "center", lineHeight: "36px", fontSize: 16, fontWeight: 700, fontFamily: FONT, marginBottom: 15 }}>{idx}</span>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 5px" }}>{ag.name}</h3>
                <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, margin: "0 0 20px", lineHeight: 1.6 }}>{ag.role}</p>

                <h4 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 10 }}>Capabilities</h4>
                <ul style={{ margin: 0, paddingLeft: 20, listStyle: "disc" }}>
                  {(CAPS[ag.id] || []).map((cap, j) => (
                    <li key={j} style={{ fontSize: 16, color: G.black, fontFamily: FONT, lineHeight: 1.6, marginBottom: 5 }}>{cap}</li>
                  ))}
                </ul>
              </div>
            );
          })() : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300 }}>
              <p style={{ fontSize: 19, color: G.darkGrey, fontFamily: FONT, textAlign: "center" }}>Select an agent from the pipeline to view its role and capabilities.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KNOWLEDGE BASE PAGE ─────────────────────

function KnowledgePage() {
  const [akb, setAkb] = useState(null);
  const [fc, setFc] = useState("All");
  const cats = [...new Set(KB.map(k => k.category))];
  const flt = fc === "All" ? KB : KB.filter(k => k.category === fc);

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 10px" }}>Knowledge base</h2>
      <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 20, lineHeight: 1.5 }}>
        Policy articles and standing advice used by the RAG / MCP Agent for automated response generation.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 25 }}>
        {["All", ...cats].map(cat => (
          <button key={cat} onClick={() => { setFc(cat); setAkb(null); }} style={{
            padding: "8px 16px", border: `2px solid ${fc === cat ? G.black : G.midGrey}`,
            background: fc === cat ? G.black : G.white, color: fc === cat ? G.white : G.black,
            fontSize: 16, fontWeight: fc === cat ? 700 : 400, cursor: "pointer", fontFamily: FONT, borderRadius: 0,
          }}>{cat}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: akb ? "1fr 1.3fr" : "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          {flt.map(kb => {
            const on = akb?.id === kb.id;
            return (
              <div key={kb.id} onClick={() => setAkb(kb)} style={{
                padding: "15px 20px", border: `2px solid ${on ? G.blue : G.midGrey}`,
                background: on ? "#e8f0fe" : G.white, cursor: "pointer", transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontFamily: FONT, fontSize: 14, color: G.darkGrey }}>{kb.id}</strong>
                  <Tag color="green">{kb.category}</Tag>
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 5 }}>{kb.topic}</div>
                <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, margin: 0, lineHeight: 1.5 }}>{kb.body.slice(0, 120)}\u2026</p>
              </div>
            );
          })}
        </div>

        {akb && (
          <div style={{ border: `1px solid ${G.midGrey}`, padding: 25, background: G.white, position: "sticky", top: 20, alignSelf: "start", animation: "fi 0.2s ease" }}>
            <strong style={{ fontFamily: FONT, fontSize: 14, color: G.darkGrey }}>{akb.id}</strong>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "5px 0 8px" }}>{akb.topic}</h3>
            <Tag color="green">{akb.category}</Tag>
            <p style={{ fontSize: 16, color: G.black, lineHeight: 1.7, fontFamily: FONT, margin: "15px 0" }}>{akb.body}</p>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 8 }}>Tags</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              {akb.tags.map(t => <Tag key={t} color="grey">{t}</Tag>)}
            </div>
            <div style={{ background: G.lightGrey, padding: "12px 15px" }}>
              <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, margin: 0 }}>
                Referenced in <strong>{DATA.filter(d => d.kb.id === akb.id).length}</strong> requests this period
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SIMULATION PAGE ─────────────────────────

function SimulationPage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedSim, setSelectedSim] = useState("cornwall-low");
  const ref = useRef(null);
  const [simKey, setSimKey] = useState(0);

  const simConfigs = {
    "cornwall-low": {
      id: "PA/2026/SIM01",
      title: "Cornwall — Flood Risk Review",
      body: "Environment Agency",
      risk: "Low",
      desc: "Cornwall Council seeks EA standing advice on a proposed 12-dwelling residential development in Flood Zone 2. The site is outside any designated SSSI and no protected species surveys have flagged concerns. A proportionate flood risk assessment has been submitted with the consultation.",
      log: [
        { agent: "Intake Agent", action: "Parsed request from Cornwall Council. Type: Flood Risk Review, FZ: 2, Dwellings: 12, SSSI: None. All required fields present.", ts: "0.8s" },
        { agent: "Classification Agent", action: "Risk: LOW. Single-topic (flood). No ecology overlap. Small-scale (12 units). No site designations.", ts: "1.9s" },
        { agent: "Routing Agent", action: "In-remit for EA. Matched KB-001 (Flood Risk Assessment) at 97% confidence. Low complexity — routed to auto-response.", ts: "2.7s" },
        { agent: "RAG / MCP Agent", action: "Retrieved standing advice from KB-001: FZ2 guidance, sequential test, proportionate FRA criteria. Cross-referenced EA Position Statement. Confidence: 96%.", ts: "4.1s" },
        { agent: "Response Agent", action: "Drafted response (231 words). Template: EA Standing Advice — FZ2 Minor Development. Key advice: proportionate FRA adequate, surface water management condition recommended.", ts: "5.6s" },
        { agent: "QA Agent", action: "Policy: PASS. Completeness: PASS. Confidence: 96% (exceeds 90% threshold). Approved. Dispatching to Cornwall Council.", ts: "6.2s" },
      ],
      result: "Total processing time: 6.2 seconds. A low-risk standard response was delivered to Cornwall Council without officer intervention. EA standing advice on Flood Zone 2 minor development was applied with site-specific context. Confidence score of 96% exceeded the 90% auto-dispatch threshold."
    },
    "high-risk": {
      id: "PA/2026/SIM02",
      title: "Manchester — Major Development Review",
      body: "Environment Agency",
      risk: "Critical",
      desc: "Manchester City Council seeks EA consultation on a proposed 200-dwelling mixed-use development in Flood Zone 3, adjacent to a designated SSSI. The site includes protected species habitats and requires major infrastructure works. Multiple environmental impact assessments have been submitted covering flood risk, ecology, and water quality.",
      log: [
        { agent: "Intake Agent", action: "Parsed request from Manchester City Council. Type: Major Development Review, FZ: 3, Dwellings: 200, SSSI: Adjacent, Ecology: Protected species present. All required fields present.", ts: "0.8s" },
        { agent: "Classification Agent", action: "Risk: CRITICAL. Multi-issue (flood, ecology, infrastructure). Large-scale (200 units). SSSI adjacency and protected species. High complexity.", ts: "1.9s" },
        { agent: "Routing Agent", action: "In-remit for EA. High complexity — escalated to senior officer with pre-loaded context.", ts: "2.4s" },
        { agent: "RAG / MCP Agent", action: "Retrieved context from KB-003 (Major Developments) and 5 precedent cases. Cross-referenced SSSI guidance and protected species policies.", ts: "3.9s" },
        { agent: "Briefing Agent", action: "Compiled briefing pack: risk summary, 5 precedent analyses, recommended approach (sequential test exemption likely required). 47-page document prepared.", ts: "5.6s" },
      ],
      result: "Total processing time: 5.6 seconds. High-risk request escalated to senior officer. Comprehensive briefing pack prepared with precedent analysis and risk assessment. Officer review required due to critical risk level and multi-issue complexity."
    }
  };

  const currentSim = simConfigs[selectedSim];

  const start = () => {
    setRunning(true); setDone(false); setSimKey(k => k + 1);
    ref.current = setTimeout(() => setDone(true), currentSim.log.length * 1400 + 800);
  };
  const reset = () => { clearTimeout(ref.current); setRunning(false); setDone(false); };
  useEffect(() => () => clearTimeout(ref.current), []);

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: G.black, fontFamily: FONT, margin: "0 0 10px" }}>Live simulation</h2>
      <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 25, lineHeight: 1.5 }}>
        Watch a planning consultation request flow through the multi-agent pipeline in real time. Select a simulation scenario below and click "Start simulation" to see how different types of requests are processed.
      </p>

      <div style={{ marginBottom: 25 }}>
        <label style={{ fontSize: 16, fontWeight: 700, color: G.black, fontFamily: FONT, marginRight: 15 }}>Select simulation:</label>
        <select value={selectedSim} onChange={(e) => setSelectedSim(e.target.value)} style={{
          padding: "8px 12px", fontSize: 16, fontFamily: FONT, border: `1px solid ${G.midGrey}`, borderRadius: 0, background: G.white
        }}>
          <option value="cornwall-low">Cornwall Low Risk (12 dwellings, FZ2)</option>
          <option value="high-risk">Manchester High Risk (200 dwellings, FZ3 + SSSI)</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        <div>
          {/* Request card */}
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 10 }}>Incoming request</h3>
          <div style={{ border: `1px solid ${G.midGrey}`, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontFamily: FONT, fontSize: 16, color: G.blue }}>{currentSim.id}</strong>
              <RiskTag risk={currentSim.risk} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 4 }}>{currentSim.title}</div>
            <div style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, marginBottom: 12 }}>Target body: {currentSim.body}</div>
            <div style={{ borderLeft: `5px solid ${G.midGrey}`, padding: "12px 16px", background: G.lightGrey }}>
              <p style={{ fontSize: 16, color: G.black, lineHeight: 1.6, fontFamily: FONT, margin: 0 }}>
                {currentSim.desc}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {!running ? (
              <button onClick={start} style={{
                padding: "10px 25px", background: G.green, color: G.white, border: "none",
                fontSize: 19, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
                boxShadow: `0 2px 0 #00572f`, borderRadius: 0,
              }}>Start simulation</button>
            ) : (
              <button onClick={reset} style={{
                padding: "10px 25px", background: G.lightGrey, color: G.black, border: `2px solid ${G.black}`,
                fontSize: 19, fontWeight: 700, fontFamily: FONT, cursor: "pointer", borderRadius: 0,
              }}>Reset</button>
            )}
          </div>

          {/* Result panel */}
          {done && (
            <div style={{ padding: "20px 25px", background: currentSim.risk === "Low" ? "#e6f4ec" : "#fff3cd", borderLeft: `5px solid ${currentSim.risk === "Low" ? G.green : "#ffc107"}`, animation: "su 0.3s ease" }}>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: currentSim.risk === "Low" ? G.green : "#856404", fontFamily: FONT, margin: "0 0 10px" }}>
                {currentSim.risk === "Low" ? "Response dispatched successfully" : "Request escalated for officer review"}
              </h3>
              <p style={{ fontSize: 16, color: G.black, lineHeight: 1.6, fontFamily: FONT, margin: 0 }}>
                {currentSim.result}
              </p>
            </div>
          )}
        </div>

        {/* Live trace */}
        <div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: G.black, fontFamily: FONT, marginBottom: 15 }}>Agent processing trace</h3>
          <div style={{ border: `1px solid ${G.midGrey}`, padding: 20, minHeight: 400, background: G.white }}>
            {!running ? (
              <p style={{ fontSize: 16, color: G.darkGrey, fontFamily: FONT, textAlign: "center", paddingTop: 120 }}>
                Press &lsquo;Start simulation&rsquo; to watch the multi-agent pipeline process this request in real time.
              </p>
            ) : (
              <Trace key={simKey} log={currentSim.log} animated={true} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ────────────────────────────────

export default function App() {
  const [page, setPage] = useState("dashboard");
  return (
    <div style={{ fontFamily: FONT, background: G.white, color: G.black, minHeight: "100vh" }}>
      <style>{CSS}</style>
      <ServiceNav active={page} onNav={setPage} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 30px 60px" }}>
        {page === "dashboard" && <DashboardPage data={DATA} onNav={setPage} />}
        {page === "requests" && <RequestsPage data={DATA} />}
        {page === "agents" && <AgentsPage />}
        {page === "knowledge" && <KnowledgePage />}
        {page === "simulation" && <SimulationPage />}
      </div>
      {/* GDS-style footer */}
      <div style={{ background: G.lightGrey, borderTop: `1px solid ${G.midGrey}`, padding: "25px 30px", marginTop: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT, margin: "0 0 5px" }}>
            Department for Environment, Food & Rural Affairs
          </p>
          <p style={{ fontSize: 14, color: G.darkGrey, fontFamily: FONT, margin: 0 }}>
            All content is available under the <a href="#" style={{ color: G.link }}>Open Government Licence v3.0</a>, except where otherwise stated
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: G.darkGrey }}>&copy; Crown copyright</span>
          </div>
        </div>
      </div>
    </div>
  );
}
