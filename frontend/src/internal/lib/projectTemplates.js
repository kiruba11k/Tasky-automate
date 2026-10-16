// Project templates: the set of tracked numbers, hidden task types and preset standards a project starts with.
// A project stores the chosen id as `template`; projects without one are 'outbound' (the original behaviour).
// Everything in the app reads `project.metrics` / `typesOff` / `customStandards`, so a template only seeds those.

/** The original tracked numbers. Kept here (domain.js re-exports it as DEFAULT_METRICS) so the registry has no import cycle. */
export const OUTBOUND_METRICS = [
  { id: "messages", label: "Messages sent" },
  { id: "responses", label: "Responses received" },
  { id: "l2", label: "2nd level sent" },
  { id: "calls", label: "Tele calls made" },
  { id: "interest", label: "Meeting interest" },
  { id: "meetings", label: "Meetings scheduled" },
  { id: "decks", label: "Decks" },
];

/** Standard task types that only make sense for outreach work. */
const OUTREACH_TYPES = ["model", "prospect", "l1", "l2", "followup", "whatsapp", "email"];

export const DEFAULT_TEMPLATE_ID = "outbound";

/** Metric ids that are counted automatically from submitted tasks (see ui/projectStats.js). Only outbound ones. */
export const AUTO_COUNTED_METRIC_IDS = ["messages", "l2", "decks"];

export const PROJECT_TEMPLATES = [
  {
    id: "outbound",
    name: "Outbound / Lead generation",
    icon: "📨",
    description: "Messages, responses, calls, meetings and decks. Prospect mapping and 1st/2nd level messages. The default.",
    metrics: OUTBOUND_METRICS,
    typesOff: [],
    customStandards: [],
    meetings: true,
  },
  {
    id: "automation",
    name: "Automation",
    icon: "⚙️",
    description: "Workflows built, bugs fixed, releases, tests and demos. Build / fix / test / deploy standards instead of outreach.",
    metrics: [
      { id: "workflows", label: "Workflows built" },
      { id: "bugs", label: "Bugs fixed" },
      { id: "releases", label: "Deployments / releases" },
      { id: "tested", label: "Automations tested" },
      { id: "demos", label: "Demos / reviews" },
    ],
    typesOff: OUTREACH_TYPES,
    customStandards: [
      { name: "Build workflow", unit: "workflows", minutes: 90 },
      { name: "Fix bug", unit: "bugs", minutes: 30 },
      { name: "Test / QA", unit: "automations", minutes: 20 },
      { name: "Deploy / release", unit: "releases", minutes: 30 },
      { name: "Review / demo", unit: "demos", minutes: 45 },
    ],
    meetings: false,
  },
  {
    id: "agents",
    name: "Agent building",
    icon: "🤖",
    description: "Agents built, prompts and tools tested, evals passed, bugs fixed, deployments and demos.",
    metrics: [
      { id: "agents", label: "Agents built" },
      { id: "prompts", label: "Prompts / tools tested" },
      { id: "evals", label: "Evals passed" },
      { id: "bugs", label: "Bugs fixed" },
      { id: "deploys", label: "Deployments" },
      { id: "demos", label: "Demos" },
    ],
    typesOff: OUTREACH_TYPES,
    customStandards: [
      { name: "Build agent", unit: "agents", minutes: 120 },
      { name: "Write / tune prompt", unit: "prompts", minutes: 25 },
      { name: "Test tool / eval", unit: "tests", minutes: 20 },
      { name: "Fix bug", unit: "bugs", minutes: 30 },
      { name: "Deploy", unit: "deployments", minutes: 30 },
      { name: "Review / demo", unit: "demos", minutes: 45 },
    ],
    meetings: false,
  },
  {
    id: "blank",
    name: "Custom / blank",
    icon: "🧩",
    description: "Start empty: no standard task types and no numbers. Add your own numbers and standard tasks.",
    metrics: [],
    typesOff: [...OUTREACH_TYPES, "deck"],
    customStandards: [],
    meetings: false,
  },
];

/** The template for an id; unknown / missing ids fall back to outbound (old projects have none). */
export const templateOf = (idOrProject) => {
  const id = typeof idOrProject === "string" ? idOrProject : idOrProject?.template;
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? PROJECT_TEMPLATES[0];
};

/** Does the project's template involve booking meetings (the Meetings tab, "booked this month")? */
export const usesMeetings = (project) => templateOf(project).meetings !== false;

/** Fresh copies of a template's metrics (never share the registry objects with project state). */
export const templateMetrics = (idOrProject) => templateOf(idOrProject).metrics.map((m) => ({ ...m }));

/** Preset custom standards of a template, as form/store drafts (without ids). */
export const templateStandards = (idOrProject) => templateOf(idOrProject).customStandards.map((c) => ({ ...c }));

/** Short random id for new custom numbers, e.g. "n-k3j9x2ab". */
export const newMetricId = () => `n-${Math.random().toString(36).slice(2, 10)}`;

/** Validate a metrics list ({id,label,unit?,periods?}); returns a cleaned copy or throws a readable Error. */
export function validateMetrics(list) {
  if (!Array.isArray(list)) throw new Error("Numbers must be a list.");
  if (list.length > 30) throw new Error("A project can track at most 30 numbers.");
  const ids = new Set();
  const labels = new Set();
  return list.map((m) => {
    const label = String(m?.label ?? "").trim();
    if (!label) throw new Error("Give every number a name.");
    if (label.length > 60) throw new Error(`"${label.slice(0, 20)}..." is too long (60 characters at most).`);
    if (labels.has(label.toLowerCase())) throw new Error(`"${label}" is listed twice.`);
    labels.add(label.toLowerCase());
    const id = String(m.id || newMetricId());
    if (ids.has(id)) throw new Error("Two numbers share the same id.");
    ids.add(id);
    const out = { id, label };
    if (m.unit) out.unit = String(m.unit).trim().slice(0, 30);
    if (Array.isArray(m.periods)) out.periods = m.periods.filter((p) => p === "week" || p === "month");
    return out;
  });
}
