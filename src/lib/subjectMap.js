/**
 * SUBJECT_MAP — normalised subject-string → canonical domain key
 *
 * Used by DashboardContext to map user-typed subject names to the
 * domain keys used by queryClassifier and domain prompts.
 *
 * Extracted from DashboardContext.jsx to keep the context lean and
 * to allow sharing across other modules (e.g., PYQ ingestion, search).
 */
export const SUBJECT_MAP = {

  // ── Computer Science — generic ────────────────────────────
  "computer science": "cs", cse: "cs",

  // ── CS sub-subjects ───────────────────────────────────────
  "web technologies": "web", "web technology": "web", web: "web",

  daa: "daa", "design and analysis": "daa",
  "design and analysis of algorithms": "daa", algorithms: "daa",

  "data structures": "dsa", dsa: "dsa", "data structures and algorithms": "dsa",

  dbms: "dbms", database: "dbms", "database management": "dbms",
  "database management systems": "dbms",

  os: "os", "operating systems": "os", "operating system": "os",

  cn: "cn", "computer networks": "cn", networking: "cn",

  oops: "oop", oop: "oop", "object oriented programming": "oop",

  "software engineering": "se", se: "se",

  "compiler design": "cd",

  "theory of computation": "toc", toc: "toc",

  "cloud computing": "cloud",

  "cyber security": "cybersecurity", cybersecurity: "cybersecurity",

  // ── AI / ML ───────────────────────────────────────────────
  ai: "ai", "artificial intelligence": "ai",
  "machine learning": "ai", ml: "ai",
  "deep learning": "ai", dl: "ai", nlp: "ai",

  // ── Mathematics — generic ─────────────────────────────────
  mathematics: "math", maths: "math", math: "math",
  "engineering mathematics": "math",

  // ── Math sub-subjects ─────────────────────────────────────
  calculus: "calculus",
  "linear algebra": "linear algebra",
  "discrete mathematics": "discrete math", "discrete math": "discrete math",
  probability: "probability",
  statistics: "statistics",
  "differential equations": "differential equations",
  "numerical methods": "numerical methods",

  // ── Physics — generic ─────────────────────────────────────
  physics: "physics", "applied physics": "physics", "engineering physics": "physics",

  // ── Physics sub-subjects ──────────────────────────────────
  mechanics: "mechanics",
  thermodynamics: "thermodynamics",
  optics: "optics",
  electrostatics: "electrostatics",
  "modern physics": "modern physics",
  "nuclear physics": "nuclear physics",

  // ── Chemistry — generic ───────────────────────────────────
  chemistry: "chemistry", "engineering chemistry": "chemistry",

  // ── Chemistry sub-subjects ────────────────────────────────
  "organic chemistry": "organic chemistry",
  "inorganic chemistry": "inorganic chemistry",
  "physical chemistry": "physical chemistry",
  biochemistry: "biochemistry",

  // ── Biology — generic ─────────────────────────────────────
  biology: "biology",

  // ── Biology sub-subjects ──────────────────────────────────
  "cell biology": "cell biology",
  genetics: "genetics",
  ecology: "ecology",
  "human anatomy": "human anatomy",
  physiology: "physiology",
  botany: "botany",
  zoology: "zoology",
  microbiology: "microbiology",
  biotechnology: "biotechnology",

  // ── Law — generic ─────────────────────────────────────────
  law: "law",

  // ── Law sub-subjects ──────────────────────────────────────
  "constitutional law": "constitutional law",
  "criminal law": "criminal law",
  "civil law": "civil law",
  "contract law": "contract law",
  ipc: "ipc", crpc: "crpc", cpc: "cpc",
  "corporate law": "corporate law",
  "intellectual property": "intellectual property",
  jurisprudence: "jurisprudence",
  "family law": "family law",
  "labour law": "labour law",
  "company law": "company law",
  "evidence law": "evidence law",

  // ── Finance — generic ─────────────────────────────────────
  finance: "finance", commerce: "finance",

  // ── Finance sub-subjects ──────────────────────────────────
  accounting: "accounting", "financial accounting": "accounting",
  "cost accounting": "accounting",
  economics: "economics",
  "micro economics": "microeconomics", microeconomics: "microeconomics",
  "macro economics": "macroeconomics", macroeconomics: "macroeconomics",
  taxation: "taxation", "income tax": "taxation",
  gst: "gst",
  banking: "banking",
  auditing: "auditing",
  "financial management": "financial management",
  "business studies": "business studies",

  // ── Mechanical Engineering — generic ──────────────────────
  "mechanical engineering": "mechanical", mechanical: "mechanical",

  // ── Mechanical sub-subjects ───────────────────────────────
  "fluid mechanics": "fluid mechanics",
  "strength of materials": "strength of materials",
  "machine design": "machine design",
  manufacturing: "manufacturing",
  "heat transfer": "heat transfer",
  "engineering mechanics": "engineering mechanics",
  "theory of machines": "theory of machines",
  "industrial engineering": "industrial engineering",

  // ── Electrical Engineering — generic ──────────────────────
  "electrical engineering": "electrical", electrical: "electrical",

  // ── Electrical sub-subjects ───────────────────────────────
  electronics: "electronics",
  "electronic devices": "electronic devices",
  "control systems": "control systems",
  "power systems": "power systems",
  "digital electronics": "digital electronics",
  microprocessors: "microprocessors",
  "signals and systems": "signals and systems",
  "circuit theory": "circuit theory",
  electromagnetic: "electromagnetic",
  vlsi: "vlsi",

  // ── Medical — generic ─────────────────────────────────────
  medical: "medical", medicine: "medical", mbbs: "medical",
  "clinical medicine": "medical",

  // ── Medical sub-subjects ──────────────────────────────────
  anatomy: "anatomy", "gross anatomy": "anatomy", neuroanatomy: "anatomy",
  pathology: "pathology", "general pathology": "pathology",
  pharmacology: "pharmacology",
  "community medicine": "community medicine", "preventive medicine": "community medicine",
  "forensic medicine": "forensic medicine", forensic: "forensic medicine",
  surgery: "surgery", "general surgery": "surgery",
  pediatrics: "pediatrics", paediatrics: "pediatrics",
  obstetrics: "obstetrics and gynaecology", gynaecology: "obstetrics and gynaecology",
  "obs and gynae": "obstetrics and gynaecology",
  psychiatry: "psychiatry",
  ophthalmology: "ophthalmology",
  ent: "ent", "ear nose throat": "ent",
  dermatology: "dermatology",
  orthopaedics: "orthopaedics", orthopedics: "orthopaedics",

  // ── Business / BBA / MBA — generic ───────────────────────
  business: "business", bba: "business", mba: "business",
  "business administration": "business", management: "business",

  // ── Business sub-subjects ─────────────────────────────────
  "principles of management": "principles of management",
  "human resource management": "hrm", hrm: "hrm",
  "marketing management": "marketing", marketing: "marketing",
  "operations management": "operations management",
  "organizational behavior": "organizational behavior",
  "organisational behaviour": "organizational behavior",
  "strategic management": "strategic management",
  entrepreneurship: "entrepreneurship",
  "business ethics": "business ethics",
  "international business": "international business",
  "business communication": "business communication",
  "research methodology": "research methodology",

  // ── UPSC Civil Services ───────────────────────────────────
  upsc: "upsc", "civil services": "upsc", "ias": "upsc", ips: "upsc",
  "upsc prelims": "upsc", "upsc mains": "upsc",
  "general studies": "upsc", polity: "upsc", governance: "upsc",
  "indian history": "upsc", "indian geography": "upsc",
  "indian economy": "upsc", "environment ecology": "upsc",
  "ethics upsc": "upsc", "gs-1": "upsc", "gs-2": "upsc",
  "gs-3": "upsc", "gs-4": "upsc",

  // ── GATE ─────────────────────────────────────────────────
  gate: "gate", "gate cs": "gate", "gate cse": "gate",
  "gate ece": "gate", "gate me": "gate", "gate ee": "gate",
  "gate exam": "gate",
};
