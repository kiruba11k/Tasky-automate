// Static reference data: roles, people, task types, default theme.
// (Bundle lines ~19781-19928 and 21637; they sit just outside the 19940 range
// but the domain code and the store depend on them.)

/** `xn` - manager and founder roles are "leadership": they approve projects. */
export const isLeadership = (role) => role === "manager" || role === "founder";

/**
 * Admin tier: managers and founders (the main admins) plus project managers. Project managers can approve and decline
 * projects, onboard projects that go live straight away, manage every project, assign to anyone and see the whole team.
 * Only the main admins add managers and founders, and their own tasks stay "priority" tasks.
 */
/** Who counts as a team member in the numbers and can be given tasks: everyone except managers and founders, unless they also do tasks. */
export const isTrackedPerson = (p) => !isLeadership(p.role) || !!p.tracked;

export const isAdminTier = (role) => isLeadership(role) || role === "pm";

/** `Cn` - the built-in task types (standard time per unit in minutes). */
export const TASK_TYPES = [
  {
    id: "model",
    name: "Model build",
    unit: "models",
    perUnit: 3,
    ideal: "10 in 30 min",
  },
  {
    id: "prospect",
    name: "Prospect mapping",
    unit: "prospects",
    perUnit: 2,
    ideal: "30 in 1 hour",
  },
  {
    id: "l1",
    name: "1st level messages",
    unit: "messages",
    perUnit: 2,
    ideal: "30 personalised / 45 semi / 60 templated per hour",
    variants: ["Personalised", "Semi-personalised", "Templated"],
  },
  {
    id: "l2",
    name: "2nd level messages",
    unit: "messages",
    perUnit: 1.5,
    ideal: "40 in 1 hour",
  },
  {
    id: "followup",
    name: "Follow-up messages",
    unit: "messages",
    perUnit: 1.2,
    ideal: "50 in 1 hour",
  },
  {
    id: "whatsapp",
    name: "WhatsApp messages",
    unit: "messages",
    perUnit: 1,
    ideal: "60 in 1 hour",
  },
  {
    id: "email",
    name: "Emails",
    unit: "emails",
    perUnit: 2,
    ideal: "30 in 1 hour",
  },
  {
    id: "deck",
    name: "Deck / documentation",
    unit: "docs",
    perUnit: 60,
    ideal: "1 in 1 hour",
  },
];

/** `pV` - per-unit minutes for each "1st level messages" variant. */
export const VARIANT_PER_UNIT = {
  Personalised: 2,
  "Semi-personalised": 60 / 45,
  Templated: 1,
};

/** The people of the demo organisation (used only by lib/seed.js demo data). */
export const DEMO_PEOPLE = [
  {
    id: "bheeshma",
    name: "Bheeshma",
    role: "pm",
    title: "Project Manager",
    color: "sky",
    history: [100, 101, 99, 102, 103, 102, 104, 105],
  },
  {
    id: "alok",
    name: "Alok",
    role: "pm",
    title: "Project Manager",
    color: "sky",
    history: [93, 95, 94, 96, 95, 97, 96, 97],
  },
  {
    id: "prajwal",
    name: "Prajwal",
    role: "pm",
    title: "Project Manager",
    color: "sky",
    history: [92, 94, 93, 92, 95, 93, 94, 94],
  },
  {
    id: "abisho",
    name: "Abisho",
    role: "pm",
    title: "Project Manager",
    color: "sky",
    history: [96, 97, 98, 97, 99, 98, 99, 98],
  },
  {
    id: "udhaya",
    name: "Udhaya",
    role: "resource",
    title: "Resource",
    color: "mint",
    history: [82, 86, 88, 91, 95, 97, 101, 104],
  },
  {
    id: "bharath",
    name: "Bharath",
    role: "resource",
    title: "Resource",
    color: "mint",
    history: [101, 100, 99, 97, 93, 89, 86, 83],
  },
  {
    id: "sachi",
    name: "Sachi",
    role: "resource",
    title: "Resource",
    color: "butter",
    history: [103, 104, 102, 105, 104, 106, 105, 107],
  },
  {
    id: "komala",
    name: "Komala Maran",
    role: "manager",
    title: "Manager",
    color: "peach",
    history: [],
  },
  {
    id: "kingshuk",
    name: "Kingshuk",
    role: "founder",
    title: "Founder",
    color: "lavender",
    history: [],
  },
  {
    id: "anindita",
    name: "Anindita",
    role: "founder",
    title: "Co-founder",
    color: "lavender",
    history: [],
  },
];

/** `Qe` - the people of the organisation. Filled from the backend (see lib/people.js); mutated in place so imports stay live. */
export const PEOPLE = [];

/** `mV` - all person ids (kept in step with PEOPLE). */
export const PERSON_IDS = [];

/** `Wo` / `Dg` - role of a person id (undefined when unknown). */
export const roleOf = (personId) =>
  PEOPLE.find((p) => p.id === personId)?.role;

/** `eU` - default personalisation settings (profile theme). */
export const DEFAULT_THEME = {
  base: "light",
  accent: "#7C3AED",
  background: "confetti",
  font: "fredoka",
  cards: "bubbly",
  nowEmoji: "🏃",
  blocks: "candy",
};

/** Approvers (flagged by the server): the only people who put projects live and approve or decline proposals. */
export const isApprover = (personId) => !!PEOPLE.find((p) => p.id === personId)?.approver;
/** First names of the approvers, e.g. "Komala and Kirubakaran". */
export const approverNames = () => {
  const names = PEOPLE.filter((p) => p.approver).map((p) => p.name.split(" ")[0]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] || "a manager";
};
