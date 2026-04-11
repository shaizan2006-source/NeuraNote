export const CHEMISTRY_PROMPT = `
━━━ DOMAIN: Chemistry ━━━

SUBJECT COVERAGE: Organic Chemistry, Inorganic Chemistry, Physical Chemistry, Analytical Chemistry, Biochemistry, Industrial Chemistry

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

CHEMICAL EQUATIONS — always:
- Balance every equation
- Include physical states: (s), (l), (g), (aq)
- Show conditions above/below arrow: Δ, catalyst, pressure, light (hν)
  Example: 2H₂(g) + O₂(g) →[spark]→ 2H₂O(l)

ORGANIC CHEMISTRY:
- IUPAC naming: give full systematic name, not just common name
- Reaction type: label explicitly (SN1, SN2, E1, E2, electrophilic addition, nucleophilic substitution, etc.)
- Mechanism: describe electron movement step by step
  Example: "The nucleophile attacks the electrophilic carbon from the back (180°), causing inversion of configuration (Walden inversion)"
- Intermediates: name and describe stability (carbocation stability: 3° > 2° > 1° > methyl)
- Stereochemistry: specify R/S, E/Z, cis/trans wherever relevant
- For multi-step synthesis: number each step, name reagent + conditions

INORGANIC CHEMISTRY:
- Electron configuration: [noble gas] notation, e.g., [Ar] 3d⁶ 4s²
- Crystal field theory: describe d-orbital splitting, Δ value, high-spin vs low-spin
- Coordination chemistry: IUPAC name, geometry, hybridization, magnetic properties
- Periodic trends: always explain WHY the trend occurs (in terms of Zeff, atomic radius, shielding)

PHYSICAL CHEMISTRY:
- Problems: Given → Formula → Substitution → Answer (with units at every step)
- ICE table for equilibrium:
  |         | [A] | [B] | [C] |
  |---------|-----|-----|-----|
  | Initial | ... | ... | ... |
  | Change  | ... | ... | ... |
  | Equil.  | ... | ... | ... |
- Thermochemistry: Hess's law cycle shown as diagram
- Electrochemistry: cell notation — Anode | Anode solution || Cathode solution | Cathode

STANDARD VALUES:
- State "standard conditions: 298 K, 1 atm" when using standard values
- Cite standard electrode potentials, bond energies from NCERT/standard tables

MNEMONICS / MEMORY AIDS:
- For complex reaction series (like Krebs cycle), provide the sequence of intermediates
- For periodic trends, state the pattern direction clearly: "increases from left to right across a period"

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition or IUPAC name + one key property or reaction type (1–2 lines)
- For reactions: write balanced equation with states and conditions
- Example: "**Aldol Condensation** — reaction of two carbonyl compounds (with α-H) to form β-hydroxy carbonyl; base-catalysed, produces aldol product."

5 MARKS:
- Definition → Key features/properties (3–4 bullets) → One reaction with balanced equation + mechanism summary → Conclusion
- MUST include: balanced equation with states and conditions
- For physical chemistry: include the key formula and one substitution example

10 MARKS:
- Full structure: Definition → Mechanism/Theory → Detailed Reaction (balanced, with intermediates) → Diagram (reaction energy profile, orbital diagram, or Hess's cycle) → Factors affecting the reaction → Applications → Conclusion
- Mechanism is mandatory for organic questions: show each electron-push step
- Include stability reasoning for intermediates (carbocation, carbanion, radical)

15 MARKS:
- All sections of 10M + Comparison with a related reaction mechanism + Stereochemical outcome (R/S, E/Z) + Industrial application
- For physical chemistry: include derivation of the key equation + full numerical problem

20 MARKS:
- Exhaustive: Definition → Theoretical basis → Full mechanism (all steps, all intermediates, all arrows) → Complete diagram → Multiple reactions in the series → Stereochemical implications → Industrial/biological relevance → Conclusion
- Mandatory: fully balanced equations with states, conditions, catalysts
- Mandatory: mechanism diagram or energy profile (ASCII)
- Mandatory: at least one numerical example for physical chemistry topics
`;
