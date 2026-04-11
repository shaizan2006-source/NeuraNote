// ──────────────────────────────────────────────────────────────
// Query Classifier — domain, marks, question type, language
// ──────────────────────────────────────────────────────────────

// ── Weighted keyword map ─────────────────────────────────────
// high = 1.0 weight (unambiguous domain signal)
// medium = 0.3 weight (could appear in multiple domains)

const DOMAIN_KEYWORDS = {
  cs: {
    high: [
      // DSA
      "binary search tree", "linked list", "hash table", "hash map",
      "dynamic programming", "breadth first search", "depth first search",
      "time complexity", "space complexity", "big o notation", "big o",
      "merge sort", "quick sort", "bubble sort", "insertion sort", "heap sort",
      "binary search", "linear search", "sorting algorithm",
      "stack overflow", "queue", "priority queue", "deque",
      "graph traversal", "dijkstra", "bellman ford", "kruskal", "prim",
      "avl tree", "red black tree", "b tree", "trie",
      // DBMS
      "normalization", "1nf", "2nf", "3nf", "bcnf", "4nf", "5nf",
      "relational algebra", "er diagram", "entity relationship",
      "foreign key", "primary key", "candidate key", "super key",
      "sql", "select query", "join operation", "inner join", "outer join",
      "acid properties", "transaction", "serializability", "concurrency control",
      "indexing", "b+ tree", "hashing in dbms",
      // OS
      "process scheduling", "round robin", "sjf", "fcfs", "priority scheduling",
      "deadlock", "banker algorithm", "resource allocation graph",
      "semaphore", "mutex", "monitor", "critical section",
      "virtual memory", "paging", "segmentation", "page replacement",
      "lru", "fifo page", "optimal page replacement",
      "context switch", "process control block", "pcb",
      "file system", "inode", "disk scheduling",
      // CN
      "osi model", "tcp/ip model", "tcp ip",
      "tcp", "udp", "ip address", "ipv4", "ipv6",
      "routing protocol", "ospf", "rip", "bgp",
      "subnet", "subnetting", "cidr",
      "dns", "dhcp", "arp", "icmp", "nat",
      "http", "https", "ftp", "smtp", "pop3",
      "sliding window", "congestion control", "flow control",
      "three way handshake", "syn", "ack",
      // Compiler / TOC
      "lexical analysis", "syntax analysis", "semantic analysis",
      "parse tree", "syntax tree", "abstract syntax tree",
      "context free grammar", "cfg", "bnf",
      "turing machine", "finite automata", "dfa", "nfa",
      "pushdown automata", "pda",
      "pumping lemma", "chomsky hierarchy", "chomsky normal form",
      "regular expression", "regular language",
      "first and follow", "ll parser", "lr parser", "slr", "lalr",
      "code generation", "code optimization", "intermediate code",
      // SE
      "software engineering", "sdlc", "agile", "scrum", "waterfall",
      "spiral model", "prototype model", "rad model",
      "uml", "use case diagram", "class diagram", "sequence diagram",
      "coupling", "cohesion", "functional requirement", "non functional",
      "testing", "unit testing", "integration testing", "regression testing",
      // OOP
      "polymorphism", "encapsulation", "inheritance", "abstraction",
      "object oriented", "oop", "constructor", "destructor",
      "virtual function", "pure virtual", "abstract class", "interface",
      "method overloading", "method overriding",
      // AI/ML
      "machine learning", "neural network", "deep learning",
      "supervised learning", "unsupervised learning", "reinforcement learning",
      "classification", "clustering", "regression",
      "decision tree", "random forest", "svm", "support vector",
      "backpropagation", "gradient descent", "loss function",
      "cnn", "rnn", "lstm", "transformer", "attention mechanism",
      "natural language processing", "nlp", "computer vision",
      // Cloud / Web
      "cloud computing", "virtualization", "docker", "kubernetes",
      "microservices", "rest api", "soap", "graphql",
      "web development", "mvc pattern", "design pattern",
      "singleton", "factory pattern", "observer pattern",
    ],
    medium: [
      "program", "code", "function", "variable", "loop", "array",
      "database", "server", "client", "network", "protocol",
      "memory", "cache", "buffer", "storage",
      "encryption", "security", "authentication", "firewall",
      "algorithm", "data structure", "programming", "object",
      "stack", "recursion", "iteration", "pointer", "reference",
      "compiler", "interpreter", "assembler",
    ],
  },

  physics: {
    high: [
      // Mechanics
      "newton", "newton's law", "force", "acceleration", "velocity",
      "momentum", "impulse", "torque", "angular momentum",
      "rotational motion", "circular motion", "centripetal",
      "projectile motion", "free fall", "inclined plane",
      "work energy theorem", "conservation of energy",
      "friction", "coefficient of friction",
      // Gravitation
      "gravitation", "gravitational field", "kepler", "orbital velocity",
      "escape velocity", "gravitational potential",
      // Thermo
      "thermodynamics", "first law of thermodynamics", "second law of thermodynamics",
      "entropy", "enthalpy", "carnot cycle", "heat engine",
      "kinetic theory of gases", "ideal gas law", "specific heat",
      "calorimetry", "isothermal", "adiabatic", "isobaric", "isochoric",
      // Waves
      "wave motion", "wavelength", "frequency", "amplitude",
      "interference", "diffraction", "polarization",
      "standing wave", "superposition", "doppler effect",
      "sound wave", "longitudinal wave", "transverse wave",
      // Optics
      "lens", "mirror", "refraction", "reflection", "prism",
      "snell's law", "total internal reflection",
      "ray optics", "wave optics", "young's double slit",
      "diffraction grating", "resolving power",
      // EM
      "electric field", "coulomb's law", "gauss's law",
      "electric potential", "capacitor", "dielectric",
      "magnetic field", "biot savart", "ampere's law",
      "faraday's law", "lenz's law", "inductance", "solenoid",
      "electromagnetic induction", "ac generator", "dc generator",
      // Modern Physics
      "photoelectric effect", "de broglie", "heisenberg uncertainty",
      "schrodinger", "bohr model", "hydrogen spectrum",
      "nuclear physics", "radioactivity", "half life",
      "nuclear fission", "nuclear fusion", "mass defect", "binding energy",
      "semiconductor", "p-n junction", "diode", "transistor",
      // Relativity
      "special relativity", "general relativity", "lorentz transformation",
      "time dilation", "length contraction", "mass energy equivalence",
    ],
    medium: [
      "energy", "power", "work", "pressure", "temperature",
      "current", "voltage", "resistance", "circuit",
      "density", "viscosity", "fluid", "speed", "motion",
      "oscillation", "pendulum", "spring",
    ],
  },

  chemistry: {
    high: [
      // Organic
      "organic chemistry", "alkane", "alkene", "alkyne", "benzene",
      "aromatic compound", "functional group",
      "aldehyde", "ketone", "carboxylic acid", "ester", "amine", "amide",
      "alcohol", "ether", "phenol",
      "sn1", "sn2", "e1", "e2", "elimination reaction", "substitution reaction",
      "addition reaction", "markovnikov", "anti markovnikov",
      "iupac naming", "iupac nomenclature",
      "isomer", "stereochemistry", "chirality", "enantiomer", "diastereomer",
      "optical isomerism", "geometrical isomerism",
      // Inorganic
      "periodic table", "electron configuration", "aufbau principle",
      "hund's rule", "pauli exclusion",
      "ionic bond", "covalent bond", "metallic bond",
      "hydrogen bond", "van der waals",
      "coordination compound", "ligand", "crystal field theory",
      "werner's theory", "chelate",
      "d block", "f block", "transition element", "lanthanide", "actinide",
      // Physical Chemistry
      "chemical equilibrium", "le chatelier", "equilibrium constant",
      "chemical kinetics", "rate law", "rate constant",
      "activation energy", "arrhenius equation",
      "electrochemistry", "galvanic cell", "electrolytic cell",
      "nernst equation", "electrode potential",
      "thermochemistry", "hess's law", "bond energy",
      "colligative properties", "osmotic pressure",
      "boiling point elevation", "freezing point depression",
      "raoult's law", "henry's law",
      "mole concept", "stoichiometry", "molarity", "molality", "normality",
      // Surface / Solid State
      "adsorption", "absorption", "colloids", "emulsion",
      "crystal lattice", "unit cell", "packing efficiency",
      // Biomolecules
      "polymer", "polymerization", "monomer",
      "carbohydrate", "protein", "lipid", "nucleic acid", "amino acid",
    ],
    medium: [
      "atom", "molecule", "element", "compound", "reaction",
      "acid", "base", "ph", "buffer", "solution", "concentration",
      "oxidation", "reduction", "redox",
      "gas law", "ideal gas",
    ],
  },

  math: {
    high: [
      // Calculus
      "calculus", "derivative", "differentiation", "integration", "integral",
      "definite integral", "indefinite integral",
      "limit", "continuity", "l'hopital",
      "mean value theorem", "rolle's theorem",
      "taylor series", "maclaurin series", "power series",
      "partial derivative", "multiple integral", "double integral",
      // Diff Eq
      "differential equation", "ode", "pde",
      "first order ode", "second order ode",
      "homogeneous equation", "particular solution", "general solution",
      "laplace transform", "inverse laplace",
      "fourier series", "fourier transform",
      // Linear Algebra
      "linear algebra", "matrix", "determinant",
      "eigenvalue", "eigenvector", "eigen",
      "vector space", "subspace", "basis", "dimension",
      "linear transformation", "rank", "nullity",
      "gaussian elimination", "row echelon",
      "cayley hamilton", "diagonalization",
      // Probability & Stats
      "probability", "conditional probability", "bayes theorem",
      "random variable", "probability distribution",
      "normal distribution", "binomial distribution", "poisson distribution",
      "expectation", "variance", "standard deviation",
      "hypothesis testing", "confidence interval",
      "chi square", "t test", "z test", "anova",
      "correlation", "regression analysis",
      // Discrete Math
      "set theory", "relation", "equivalence relation",
      "partial order", "lattice", "boolean algebra",
      "combinatorics", "permutation", "combination",
      "pigeonhole principle", "inclusion exclusion",
      "graph theory", "euler path", "hamiltonian path",
      "planar graph", "chromatic number", "bipartite",
      // Number Theory
      "number theory", "prime number", "gcd", "lcm",
      "modular arithmetic", "congruence", "euler's totient",
      "fermat's little theorem", "chinese remainder theorem",
      // Complex Analysis
      "complex number", "complex analysis", "analytic function",
      "cauchy's theorem", "residue theorem", "contour integral",
      // Geometry / Trig
      "conic section", "parabola", "ellipse", "hyperbola",
      "trigonometry", "trigonometric identity",
      "coordinate geometry", "straight line", "circle equation",
      "vector", "dot product", "cross product",
    ],
    medium: [
      "equation", "formula", "proof", "theorem", "solve",
      "polynomial", "quadratic", "logarithm", "exponential",
      "function", "domain", "range", "injective", "surjective",
    ],
  },

  biology: {
    high: [
      // Cell Biology
      "cell biology", "cell membrane", "plasma membrane",
      "mitochondria", "endoplasmic reticulum", "golgi apparatus",
      "nucleus", "ribosome", "lysosome", "vacuole",
      "cell wall", "chloroplast", "cytoplasm", "cytoskeleton",
      // Cell Division
      "mitosis", "meiosis", "cell cycle", "interphase",
      "prophase", "metaphase", "anaphase", "telophase",
      "cytokinesis", "spindle fiber",
      // Molecular Biology
      "dna replication", "transcription", "translation",
      "gene expression", "mrna", "trna", "rrna",
      "genetic code", "codon", "anticodon",
      "central dogma", "operon", "lac operon",
      "dna fingerprinting", "pcr", "gel electrophoresis",
      "restriction enzyme", "recombinant dna", "cloning vector",
      // Genetics
      "genetics", "mendelian", "mendel's law",
      "genotype", "phenotype", "allele", "locus",
      "dominant", "recessive", "codominance", "incomplete dominance",
      "linkage", "crossing over", "genetic map",
      "punnett square", "test cross", "dihybrid cross",
      "sex linked", "autosomal", "pedigree analysis",
      // Evolution
      "evolution", "natural selection", "darwin",
      "speciation", "adaptive radiation", "convergent evolution",
      "hardy weinberg", "genetic drift", "gene flow",
      // Taxonomy
      "taxonomy", "binomial nomenclature", "linnaeus",
      "kingdom", "phylum", "class", "order", "family", "genus", "species",
      "monera", "protista", "fungi", "plantae", "animalia",
      // Ecology
      "ecology", "ecosystem", "biome", "food chain", "food web",
      "trophic level", "ecological pyramid", "ecological succession",
      "biodiversity", "conservation", "endangered species",
      "biogeochemical cycle", "carbon cycle", "nitrogen cycle",
      // Physiology
      "anatomy", "physiology", "organ system",
      "circulatory system", "heart", "blood vessel",
      "respiratory system", "alveoli", "gas exchange",
      "nervous system", "neuron", "synapse", "reflex arc",
      "digestive system", "peristalsis", "enzyme digestion",
      "excretory system", "nephron", "kidney function",
      "endocrine system", "hormone", "pituitary", "thyroid",
      // Biochemistry
      "photosynthesis", "light reaction", "dark reaction", "calvin cycle",
      "cellular respiration", "glycolysis", "krebs cycle", "etc chain",
      "atp", "nadh", "fadh2",
      "enzyme", "substrate", "active site", "michaelis menten",
      // Immunity
      "immunity", "immune system", "antibody", "antigen",
      "vaccine", "pathogen", "lymphocyte", "phagocyte",
      "innate immunity", "adaptive immunity",
      // Biotech
      "biotechnology", "genetic engineering", "gmo",
      "monoclonal antibody", "stem cell", "gene therapy",
    ],
    medium: [
      "organism", "plant", "animal", "bacteria", "virus",
      "blood", "lung", "brain", "liver",
      "tissue", "organ", "cell",
      "reproduction", "growth", "development",
    ],
  },

  law: {
    high: [
      // Constitutional
      "constitution", "constitutional law", "fundamental rights",
      "article 14", "article 19", "article 21", "article 32",
      "directive principles", "dpsp", "fundamental duties",
      "preamble", "amendment", "basic structure doctrine",
      "separation of powers", "federalism", "unitary",
      "president", "governor", "parliament", "legislature",
      "judicial review", "writ jurisdiction",
      "habeas corpus", "mandamus", "certiorari", "prohibition", "quo warranto",
      // Criminal
      "ipc", "indian penal code", "bns", "bharatiya nyaya sanhita",
      "crpc", "criminal procedure", "bnss",
      "section 302", "section 304", "section 299", "section 300",
      "section 34", "section 120b",
      "cognizable", "non cognizable", "bailable", "non bailable",
      "fir", "charge sheet", "chargesheet",
      "bail", "anticipatory bail", "regular bail",
      "mens rea", "actus reus", "guilty mind",
      // Civil
      "cpc", "civil procedure", "suit", "plaint", "written statement",
      "decree", "order", "judgment",
      "appeal", "revision", "review",
      "res judicata", "estoppel",
      // Contract
      "contract act", "indian contract act",
      "offer", "acceptance", "consideration", "free consent",
      "void contract", "voidable contract", "void agreement",
      "breach of contract", "specific performance",
      "indemnity", "guarantee", "bailment", "pledge", "agency",
      // Tort
      "tort", "tortious liability", "negligence",
      "strict liability", "absolute liability",
      "vicarious liability", "nuisance", "trespass", "defamation",
      "rylands v fletcher", "donoghue v stevenson",
      // Evidence
      "evidence act", "indian evidence act", "bsa",
      "witness", "examination", "cross examination",
      "confession", "admission", "hearsay",
      "burden of proof", "presumption",
      // Corporate / IP
      "company law", "companies act", "memorandum of association",
      "articles of association", "board of directors",
      "shareholder", "winding up", "liquidation",
      "intellectual property", "patent", "trademark", "copyright",
      "arbitration", "mediation", "adr", "lok adalat",
      // Family / Labour
      "family law", "hindu marriage act", "special marriage act",
      "divorce", "maintenance", "custody", "adoption",
      "labour law", "industrial dispute", "trade union",
      "workmen compensation", "minimum wages",
      // Jurisprudence
      "jurisprudence", "natural law", "positivism", "legal realism",
      "austin", "kelsen", "hart", "dworkin",
      "precedent", "ratio decidendi", "obiter dicta", "stare decisis",
      "ultra vires", "intra vires",
    ],
    medium: [
      "court", "judge", "lawyer", "advocate", "legal",
      "law", "act", "rule", "regulation", "order",
      "right", "duty", "liability", "damages", "remedy",
      "section", "article", "clause", "provision", "statute",
      "plaintiff", "defendant", "prosecution", "accused",
    ],
  },

  finance: {
    high: [
      // Accounting
      "journal entry", "ledger", "trial balance",
      "balance sheet", "profit and loss", "income statement",
      "cash flow statement", "fund flow statement",
      "depreciation", "straight line method", "wdv method",
      "amortization", "provision", "reserve",
      "debit", "credit", "double entry", "bookkeeping",
      "accounting standard", "ind as", "ifrs", "gaap",
      "accounting equation", "accounting cycle",
      "bank reconciliation", "rectification of errors",
      "consignment", "joint venture", "partnership account",
      // Cost Accounting
      "cost accounting", "marginal costing", "absorption costing",
      "cost sheet", "prime cost", "factory cost", "cost of production",
      "break even analysis", "break even point", "contribution margin",
      "budgeting", "budget variance", "flexible budget",
      "standard costing", "material variance", "labour variance",
      "process costing", "job costing", "contract costing",
      // Financial Management
      "financial management", "capital budgeting",
      "npv", "net present value", "irr", "internal rate of return",
      "payback period", "profitability index",
      "working capital", "operating cycle", "cash conversion cycle",
      "capital structure", "modigliani miller", "wacc",
      "dividend policy", "gordon model", "walter model",
      "leverage", "operating leverage", "financial leverage",
      // Taxation
      "income tax", "income tax act", "section 80c", "section 44ad",
      "gst", "goods and services tax", "cgst", "sgst", "igst",
      "tds", "advance tax", "assessment",
      "capital gains", "ltcg", "stcg",
      "tax planning", "tax avoidance", "tax evasion",
      // Banking / Finance
      "banking", "rbi", "reserve bank",
      "monetary policy", "repo rate", "reverse repo",
      "crr", "slr", "cash reserve ratio",
      "commercial bank", "central bank", "nbfc",
      "share", "debenture", "bond", "mutual fund", "portfolio",
      "stock exchange", "nse", "bse", "sebi",
      // Ratio Analysis
      "ratio analysis", "current ratio", "quick ratio", "acid test",
      "debt equity ratio", "roe", "roa", "roce",
      "earnings per share", "eps", "price earnings ratio", "pe ratio",
      "gross profit ratio", "net profit ratio", "operating ratio",
      // Economics
      "microeconomics", "macroeconomics",
      "demand", "supply", "demand curve", "supply curve",
      "elasticity", "price elasticity", "income elasticity",
      "marginal utility", "consumer surplus", "producer surplus",
      "gdp", "gnp", "national income", "per capita income",
      "inflation", "deflation", "stagflation",
      "fiscal policy", "monetary policy", "fiscal deficit",
      "monopoly", "oligopoly", "perfect competition", "monopolistic competition",
      // Audit
      "auditing", "audit", "internal audit", "external audit",
      "vouching", "verification", "internal control",
      "audit report", "qualified opinion", "unqualified opinion",
    ],
    medium: [
      "cost", "revenue", "profit", "loss", "investment",
      "interest", "compound interest", "simple interest",
      "market", "price", "value", "return", "risk",
      "asset", "liability", "equity", "capital",
    ],
  },

  mechanical: {
    high: [
      // Thermodynamics
      "thermodynamics", "first law", "second law", "zeroth law",
      "carnot cycle", "rankine cycle", "otto cycle", "diesel cycle",
      "brayton cycle", "stirling cycle",
      "heat engine", "refrigerator", "heat pump",
      "entropy generation", "exergy", "availability",
      "clausius inequality", "kelvin planck", "clausius statement",
      // Heat Transfer
      "heat transfer", "conduction", "convection", "radiation",
      "fourier's law", "newton's law of cooling",
      "stefan boltzmann", "kirchhoff's law of radiation",
      "heat exchanger", "lmtd", "ntu method",
      "fin", "thermal resistance", "thermal conductivity",
      // Fluid Mechanics
      "fluid mechanics", "bernoulli's equation", "bernoulli",
      "reynolds number", "laminar flow", "turbulent flow",
      "navier stokes", "euler equation",
      "pipe flow", "head loss", "darcy weisbach",
      "moody diagram", "boundary layer",
      "manometer", "venturimeter", "orifice meter",
      "dimensional analysis", "buckingham pi",
      // SOM / Mechanics of Materials
      "strength of materials", "mechanics of materials",
      "stress", "strain", "young's modulus", "poisson's ratio",
      "shear stress", "shear strain", "shear modulus",
      "bending moment", "shear force", "sfd", "bmd",
      "deflection of beam", "macaulay's method", "moment area",
      "torsion", "torsion of shaft", "power transmission",
      "mohr's circle", "principal stress", "principal strain",
      "column buckling", "euler's buckling", "slenderness ratio",
      "fatigue", "creep", "stress concentration",
      // Manufacturing
      "manufacturing process", "casting", "forging", "rolling",
      "extrusion", "drawing", "sheet metal",
      "welding", "arc welding", "gas welding", "tig", "mig",
      "machining", "turning", "milling", "drilling", "grinding",
      "cnc", "cnc machine", "g code", "m code",
      "lathe", "shaper", "planer", "slotter",
      "merchant's circle", "cutting force", "tool wear",
      "jig", "fixture", "tool life", "taylor's tool life",
      // Machine Design
      "machine design", "gear", "spur gear", "helical gear", "bevel gear",
      "bearing", "journal bearing", "ball bearing", "roller bearing",
      "shaft", "coupling", "flange coupling", "universal joint",
      "belt drive", "chain drive", "rope drive",
      "flywheel", "governor", "brake", "clutch",
      "spring", "leaf spring", "helical spring",
      "screw", "bolt", "nut", "power screw",
      // Kinematics / Dynamics
      "kinematics of machinery", "mechanism", "four bar linkage",
      "cam", "follower", "cam profile",
      "gear train", "epicyclic gear train", "velocity diagram",
      // RAC
      "refrigeration", "hvac", "compressor", "condenser", "evaporator",
      "cop", "refrigerant", "vapour compression",
      // IC Engine
      "ic engine", "internal combustion", "compression ratio",
      "fuel injection", "turbocharger", "supercharger",
      // Engineering Drawing
      "engineering drawing", "projection", "isometric view",
      "sectional view", "tolerance", "surface finish", "fits",
    ],
    medium: [
      "engine", "turbine", "pump", "nozzle",
      "material", "steel", "alloy", "composite",
      "friction", "lubrication", "wear",
      "pressure vessel", "boiler",
    ],
  },

  electrical: {
    high: [
      // Circuit Analysis
      "circuit analysis", "kirchhoff", "kvl", "kcl",
      "ohm's law", "ohm law",
      "thevenin", "norton", "superposition theorem",
      "mesh analysis", "nodal analysis",
      "maximum power transfer", "reciprocity theorem",
      "star delta", "delta star", "y delta transformation",
      // AC Circuits
      "ac circuit", "impedance", "reactance", "admittance",
      "phasor diagram", "phasor",
      "power factor", "real power", "reactive power", "apparent power",
      "resonance", "series resonance", "parallel resonance",
      "three phase", "balanced load", "unbalanced load",
      "power triangle",
      // Machines
      "transformer", "ideal transformer", "auto transformer",
      "induction motor", "synchronous motor", "synchronous generator",
      "dc motor", "dc generator", "shunt motor", "series motor",
      "armature", "field winding", "commutator",
      "emf equation", "torque equation", "speed control",
      "alternator", "excitation",
      // Control Systems
      "control system", "transfer function", "block diagram",
      "signal flow graph", "mason's gain",
      "bode plot", "nyquist plot", "nyquist criterion",
      "root locus", "routh hurwitz", "routh array",
      "pid controller", "proportional",
      "gain margin", "phase margin",
      "state space", "controllability", "observability",
      // Signals & Systems
      "signal processing", "dft", "fft",
      "z transform", "inverse z transform",
      "inverse laplace transform",
      "convolution", "impulse response", "step response",
      "sampling theorem", "nyquist rate", "aliasing",
      "filter", "low pass", "high pass", "band pass",
      // Digital Electronics
      "digital electronics", "logic gate", "and gate", "or gate", "not gate",
      "nand gate", "nor gate", "xor gate",
      "flip flop", "sr flip flop", "jk flip flop", "d flip flop",
      "counter", "shift register", "multiplexer", "demultiplexer",
      "encoder", "decoder", "adc", "dac",
      "karnaugh map", "k map",
      // Microprocessor
      "microprocessor", "8085", "8086", "8051",
      "microcontroller", "arduino", "embedded system",
      "instruction set", "addressing mode",
      // Power Systems
      "power system", "transmission line", "distribution system",
      "load flow", "power flow", "bus admittance",
      "fault analysis", "symmetrical fault", "unsymmetrical fault",
      "protection", "relay", "circuit breaker", "switchgear",
      "per unit system", "load dispatch",
      // Electromagnetic
      "electromagnetic", "maxwell's equations",
      "antenna", "waveguide", "transmission line theory",
      "smith chart", "vswr",
    ],
    medium: [
      "voltage", "current", "resistance", "capacitance", "inductance",
      "power", "energy", "watt", "ampere", "volt",
      "electric", "electronic", "electrical",
      "diode", "transistor", "amplifier", "oscillator",
      // Demoted from high — too generic; overlap with math/cs domains
      "integral", "derivative", "stability",
      "laplace transform", "fourier transform", "boolean algebra",
    ],
  },

  medical: {
    high: [
      // Clinical medicine
      "pathophysiology", "etiology", "aetiology", "clinical features", "signs and symptoms",
      "differential diagnosis", "definitive diagnosis", "investigations", "management",
      "prognosis", "complications", "epidemiology", "incidence", "prevalence",
      "morbidity", "mortality", "case fatality rate",
      // Anatomy (clinical-specific terms — generic "anatomy" stays in biology)
      "gross anatomy", "neuroanatomy", "topographic anatomy",
      "blood supply", "nerve supply", "lymphatic drainage", "anatomical relations",
      "dissection", "osteology", "myology", "arthrology",
      "histological structure", "embryological development",
      // Physiology (clinical-specific)
      "cardiac output", "stroke volume", "glomerular filtration rate", "gfr",
      "renal tubular", "action potential", "resting membrane potential",
      "hormonal regulation", "endocrine physiology", "respiratory physiology",
      "gastrointestinal physiology", "neurotransmitter", "mean arterial pressure",
      // Biochemistry (medical context — inborn errors, metabolic disease)
      "inborn error of metabolism", "metabolic disorder", "enzyme deficiency",
      // Pharmacology
      "mechanism of action", "pharmacokinetics", "pharmacodynamics", "adme",
      "drug interaction", "adverse effects", "contraindication", "antidote",
      "antibiotic", "antifungal", "antiviral", "analgesic", "antipyretic",
      "antihypertensive", "beta blocker", "ace inhibitor", "diuretic",
      "anticoagulant", "antiplatelet", "statin", "antidiabetic", "insulin",
      "corticosteroid", "nsaid", "opioid", "benzodiazepine", "ssri",
      // Pathology
      "biopsy", "histopathology", "cytology", "neoplasm", "carcinoma",
      "benign tumor", "malignant", "metastasis", "tumor marker",
      "inflammation", "necrosis", "apoptosis", "granuloma", "abscess",
      "edema", "thrombosis", "embolism", "infarction",
      // Microbiology
      "gram positive", "gram negative", "culture sensitivity", "antibiotic resistance",
      "mrsa", "opportunistic infection", "virulence factor", "serotype",
      "mycobacterium tuberculosis", "plasmodium", "salmonella typhi",
      // Specific diseases
      "myocardial infarction", "heart failure", "angina pectoris",
      "hypertension", "diabetes mellitus", "diabetic ketoacidosis",
      "pneumonia", "tuberculosis", "pulmonary embolism",
      "malaria", "dengue fever", "typhoid", "hepatitis",
      "cirrhosis", "peptic ulcer", "appendicitis", "cholecystitis",
      "stroke", "epilepsy", "meningitis", "encephalitis",
      "anemia", "leukemia", "lymphoma",
      "urinary tract infection", "uti", "pyelonephritis",
      "rheumatoid arthritis", "osteoarthritis", "gout",
      "thyroid disorder", "hypothyroidism", "hyperthyroidism",
      "ectopic pregnancy", "preeclampsia", "gestational diabetes",
      // Surgery
      "surgical procedure", "anastomosis", "laparotomy", "laparoscopy",
      "appendectomy", "cholecystectomy", "hernia repair", "amputation",
      // Exams / context
      "mbbs", "clinical vignette", "case history", "ward round",
    ],
    medium: [
      "patient", "symptoms", "diagnosis", "treatment", "therapy",
      "disease", "disorder", "syndrome", "condition", "infection",
      "blood", "urine", "fever", "pain", "swelling",
      "surgery", "operation", "hospital", "clinical", "medical",
      "drug", "dose", "tablet", "injection", "vaccine",
    ],
  },

  business: {
    high: [
      // Principles of Management
      "principles of management", "fayol", "scientific management", "taylor",
      "management by objectives", "mbo", "planning organizing directing controlling",
      "posdcorb", "management functions", "span of control", "unity of command",
      "delegation of authority", "decentralization", "centralization",
      // HRM
      "human resource management", "hrm", "recruitment process", "selection process",
      "job analysis", "job description", "job specification", "performance appraisal",
      "training and development", "compensation management", "workforce planning",
      "talent management", "employee engagement", "industrial relations",
      "grievance handling", "collective bargaining", "trade union management",
      // Marketing
      "marketing mix", "4ps of marketing", "7ps of marketing", "product life cycle",
      "market segmentation", "targeting and positioning", "stp analysis",
      "consumer behavior", "buying behavior", "brand management", "brand equity",
      "advertising", "sales promotion", "personal selling", "public relations",
      "distribution channel", "channel of distribution", "pricing strategy",
      "penetration pricing", "skimming pricing", "market research",
      // Strategy
      "swot analysis", "swot", "porter's five forces", "porter five forces", "five forces", "porter", "competitive advantage",
      "core competency", "value chain analysis", "bcg matrix", "ansoff matrix",
      "balanced scorecard", "strategic management", "pestle analysis",
      "industry analysis", "environmental scanning", "strategic planning",
      "corporate strategy", "business level strategy", "functional strategy",
      "merger and acquisition", "joint venture", "strategic alliance",
      "diversification strategy", "horizontal integration", "vertical integration",
      // Operations Management
      "operations management", "supply chain management", "total quality management",
      "tqm", "six sigma", "lean manufacturing", "just in time", "jit",
      "eoq", "economic order quantity", "inventory management", "mrp",
      "capacity planning", "facility location", "plant layout",
      "quality control", "iso certification", "benchmarking",
      // Organizational Behaviour
      "organizational behavior", "organisational behaviour",
      "maslow's hierarchy", "herzberg two factor", "mcgregor theory x y",
      "vroom expectancy theory", "mcclelland need theory",
      "transactional leadership", "transformational leadership",
      "leadership style", "situational leadership", "servant leadership",
      "group dynamics", "team building", "conflict management",
      "organizational culture", "change management", "organizational development",
      "communication barriers", "grapevine communication",
      // Entrepreneurship
      "entrepreneurship", "entrepreneur", "startup ecosystem",
      "business plan", "venture capital", "angel investor",
      "intrapreneurship", "social entrepreneurship", "innovation management",
      // Corporate Governance & Ethics
      "corporate governance", "corporate social responsibility", "csr",
      "business ethics", "stakeholder theory", "sustainability",
      "whistle blowing", "code of conduct",
    ],
    medium: [
      "management", "business", "organization", "company", "firm",
      "strategy", "market", "customer", "employee", "team",
      "performance", "productivity", "efficiency", "effectiveness",
      "leadership", "motivation", "communication", "decision making",
      "planning", "controlling", "coordinating",
    ],
  },
};


// ── Question type detection ──────────────────────────────────
function detectQuestionType(question) {
  const q = question.toLowerCase().trim();

  // Check start-of-question patterns first (highest priority)
  if (/^(solve|calculate|find the value|compute|evaluate|determine)\b/.test(q)) return "problem";
  if (/^(prove|derive|show that|verify that|deduce)\b/.test(q)) return "derivation";
  if (/^(compare|differentiate|distinguish|contrast|difference between|distinguish between|tabulate|.*\bvs\.?\b)/i.test(q)) return "comparison";
  if (/^(draw|sketch|diagram of|flowchart of|block diagram)\b/.test(q)) return "diagram";
  if (/^(write a program|write code|implement|code for|write a function)\b/.test(q)) return "code";
  if (/^(define|what is|what are|meaning of|state the definition)\b/.test(q)) return "definition";

  // Check anywhere-in-question patterns
  if (/\b(case study|analyze the scenario|given scenario|real.?world example)\b/.test(q)) return "case-study";
  if (/\b(compare and contrast|differentiate between|distinguish between|similarities and differences|in tabular form|in table form|in table format|tabular form|make a table|give .* in (a )?table|present .* in (a )?table)\b/.test(q)) return "comparison";
  if (/\b(write a program|write code|implement.*algorithm|code.*in)\b/.test(q)) return "code";
  if (/\b(solve|calculate|find|compute|evaluate)\b/.test(q) && /\b(=|equation|value|result)\b/.test(q)) return "problem";

  return "theory";
}


// ── Marks detection ──────────────────────────────────────────
function detectMarks(question) {
  const q = question.toLowerCase();

  const patterns = [
    /(\d{1,2})\s*m(?:arks?)?(?:\s|$|[.,;)\]])/i,
    /\((\d{1,2})\s*m(?:arks?)?\)/i,
    /(?:for|of)\s+(\d{1,2})\s+marks/i,
    /\[(\d{1,2})\s*m(?:arks?)?\]/i,
    /marks?\s*[:=]\s*(\d{1,2})/i,
  ];

  for (const p of patterns) {
    const match = q.match(p);
    if (match) {
      const n = parseInt(match[1]);
      if (n <= 3) return 2;
      if (n <= 7) return 5;
      if (n <= 12) return 10;
      if (n <= 17) return 15;
      return 20;
    }
  }

  // Heuristic inference from phrasing
  if (/^(define|what is|what are|name|list|state)\b/i.test(q)) return 2;
  if (/^(explain|describe)\b/i.test(q) && !/\b(in detail|elaborate|comprehensive)\b/i.test(q)) return 10;
  if (/\b(in detail|elaborate|discuss at length|critically analyze|comprehensive)\b/i.test(q)) return 15;
  if (/\b(write an essay|full answer|detailed account|exhaustive)\b/i.test(q)) return 20;

  return 10; // safe default
}


// ── Difficulty inference ─────────────────────────────────────
function inferDifficulty(marks, question) {
  if (marks <= 2) return "basic";
  if (marks >= 15) return "advanced";

  const q = question.toLowerCase();
  if (/\b(analyze|evaluate|critically|synthesize|design|compare and contrast)\b/.test(q)) return "advanced";
  if (/\b(define|list|state|name|identify)\b/.test(q)) return "basic";

  return "intermediate";
}


// ── Language detection ───────────────────────────────────────
function detectLanguage(question) {
  const hasHindi = /[\u0900-\u097F]/.test(question);
  const hasLatin = /[a-zA-Z]/.test(question);

  if (hasHindi && hasLatin) return "hinglish";
  if (hasHindi) return "hi";
  return "en";
}


// ── Domain scoring ───────────────────────────────────────────
function scoreDomains(question) {
  const q = question.toLowerCase();
  const scores = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    // Check phrases longest-first (high-confidence keywords)
    for (const kw of keywords.high) {
      if (q.includes(kw)) score += 1.0;
    }
    // Medium-confidence keywords
    for (const kw of keywords.medium) {
      if (q.includes(kw)) score += 0.3;
    }
    scores[domain] = score;
  }

  return scores;
}


// ── Main classifier ──────────────────────────────────────────
export function classifyQuery(question, metadata = {}) {
  // If UI provides domain + marks, use directly
  if (metadata.domain && metadata.marks) {
    return {
      domain: metadata.domain,
      relatedDomain: null,
      subdomain: null,
      questionType: detectQuestionType(question),
      marks: metadata.marks,
      difficulty: inferDifficulty(metadata.marks, question),
      language: detectLanguage(question),
      confidence: "explicit",
      originalQuestion: question,
    };
  }

  const marks = metadata.marks || detectMarks(question);
  const questionType = detectQuestionType(question);
  const language = detectLanguage(question);

  // Domain classification via keyword scoring
  const domainScores = scoreDomains(question);
  const sorted = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);

  const topDomain = sorted[0];
  const secondDomain = sorted[1];

  let domain, confidence, relatedDomain = null;

  if (topDomain[1] === 0) {
    domain = "general";
    confidence = "none";
  } else if (topDomain[1] >= 2.0 && topDomain[1] > secondDomain[1] * 1.5) {
    domain = topDomain[0];
    confidence = "high";
  } else if (topDomain[1] >= 0.5) {
    domain = topDomain[0];
    confidence = "medium";
    if (secondDomain[1] > 0 && topDomain[1] < secondDomain[1] * 2) {
      relatedDomain = secondDomain[0];
    }
  } else {
    domain = "general";
    confidence = "low";
  }

  // Override with metadata if provided
  if (metadata.domain) domain = metadata.domain;

  return {
    domain,
    relatedDomain,
    subdomain: null,
    questionType,
    marks,
    difficulty: inferDifficulty(marks, question),
    language,
    confidence,
    originalQuestion: question,
  };
}
