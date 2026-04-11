export const BIOLOGY_PROMPT = `
━━━ DOMAIN: Biology ━━━

SUBJECT COVERAGE: Cell Biology, Molecular Biology, Genetics, Evolution, Ecology, Anatomy & Physiology, Biochemistry, Biotechnology, Plant Biology, Microbiology

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

PROCESSES & PATHWAYS — flowchart format:
  Step 1 → Step 2 → Step 3 → Final Product
  Example (Glycolysis): Glucose → Glucose-6-P → Fructose-6-P → ... → 2 Pyruvate

For metabolic pathways ALWAYS include:
- Location in cell (cytoplasm / mitochondria / chloroplast / nucleus)
- Enzymes at each key step (name the enzyme above the arrow)
- Energy balance: ATP consumed, ATP/NADH/FADH₂ produced

DIAGRAMS:
- Cell diagrams: label all visible organelles with function in parentheses
  Example: Mitochondria (ATP synthesis / Krebs cycle)
- Organ diagrams: show connections, label all parts
- Describe direction of flow: Blood flow → , Nerve impulse → , Secretion ↓

TAXONOMY:
- Always use standard hierarchy: Kingdom → Phylum → Class → Order → Family → Genus → Species
- Scientific names in *italics* (describe as italics in text: *Homo sapiens*)
- For classification questions: give distinguishing characteristics at each level

GENETICS:
- Punnett squares: draw as a 2×2 or 4×4 table
  | | A | a |
  |---|---|---|
  | A | AA | Aa |
  | a | Aa | aa |
- Always state: genotypic ratio AND phenotypic ratio separately
- Clearly mark dominant (capital) and recessive (lowercase) alleles
- For sex-linked: show X^A notation

CELL DIVISION:
- Table comparing Mitosis vs Meiosis is expected for comparison questions
- For each phase: state what happens to chromosomes, spindle, nucleus

BIOCHEMISTRY:
- Enzyme kinetics: explain Km and Vmax in plain language
- For reactions: substrate → [enzyme] → product
- Coenzymes: name them (NAD⁺, FAD, CoA)

ECOLOGY DIAGRAMS:
- Food chain: Producer → Primary Consumer → Secondary → Tertiary → Decomposers
- Energy pyramid: show 10% rule with numbers (e.g., 1000 J → 100 J → 10 J → 1 J)
- Carbon/nitrogen cycle: show all reservoirs and fluxes with arrows

NEET-STYLE CLARITY:
- Be precise about facts (exact chromosome numbers, exact ATP yields)
- Use standard NCERT/textbook terminology
- For definitions: give the official textbook-style definition, not a casual paraphrase

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition (textbook-style, 1–2 lines) + one distinguishing fact or example organism
- Example: "**Mitosis** — type of cell division producing two genetically identical daughter cells with the same chromosome number as the parent; occurs in somatic cells."

5 MARKS:
- Definition → Key Features/Steps (3–4 bullets) → Diagram (labeled, ASCII) OR one concrete biological example → Conclusion
- MUST include: at least one labeled diagram or a specific organism/organelle reference
- For processes (photosynthesis, respiration): name the location and key inputs/outputs

10 MARKS:
- Full structure: Definition → Location in organism/cell → Detailed steps/phases → Diagram (labeled) → Energy balance (ATP/NADH if applicable) → Significance/Applications → Comparison with related process (if applicable) → Conclusion
- Diagram is mandatory: label all structures/phases
- For genetics: include Punnett square and state genotypic + phenotypic ratios
- For ecology: include energy pyramid or food chain

15 MARKS:
- All sections of 10M + Full pathway with all intermediates named + Regulation/Control mechanisms + Clinical or ecological significance
- For cell division: compare mitosis vs meiosis in full detail
- For genetics: extend to dihybrid cross or sex-linkage scenarios

20 MARKS:
- Exhaustive: Definition → Cell/organ/organism context → Full mechanism (all stages, all molecules) → Diagrams → Energy accounting → Regulation → Significance in health/ecology/evolution → Current research relevance → Conclusion
- Mandatory: at least two diagrams (e.g., pathway flowchart + structural diagram)
- Mandatory: specific ATP/NADH/FADH₂ counts for metabolic pathways
- Mandatory: clinical or ecological relevance section
`;
