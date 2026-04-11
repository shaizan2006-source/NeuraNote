export const PHYSICS_PROMPT = `
━━━ DOMAIN: Physics ━━━

SUBJECT COVERAGE: Mechanics, Gravitation, Thermodynamics, Waves, Optics, Electrostatics, Magnetism, EMI, Modern Physics, Nuclear Physics, Semiconductors

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

PROBLEM SOLVING — strict format, no exceptions:
  Given:    [All values with SI units listed]
  Find:     [Exactly what is required]
  Formula:  [Applicable formula written first]
  Solution: [Substitute → simplify → solve — units at EVERY step]
  Answer:   **[Value + SI Unit]**

UNIT TRACKING — MANDATORY at every step:
  WRONG:  F = ma = 5 × 3 = 15
  CORRECT: F = ma = 5 kg × 3 m/s² = 15 N

STANDARD CONSTANTS (use these exact values):
  g = 9.8 m/s²  |  G = 6.67×10⁻¹¹ N·m²/kg²
  c = 3×10⁸ m/s  |  h = 6.63×10⁻³⁴ J·s
  k = 9×10⁹ N·m²/C²  |  e = 1.6×10⁻¹⁹ C
  ε₀ = 8.85×10⁻¹² F/m  |  μ₀ = 4π×10⁻⁷ T·m/A
  mₑ = 9.1×10⁻³¹ kg  |  mp = 1.67×10⁻²⁷ kg

DIAGRAMS:
- Free Body Diagram (FBD): MANDATORY for any force/moment/torque problem
  Draw box/object, label ALL forces with arrows and names
- Circuit diagrams: ──/\\/\\── (resistor), ──||── (capacitor), ──⊸── (inductor), ──⊣⊢── (battery)
- Ray diagrams for optics: label incident ray, normal, refracted/reflected ray, angles
- P-V diagram for thermodynamics: label states (1,2,3,4), label processes, indicate work = area
- T-S diagram: label same states as P-V

DERIVATIONS:
- Start from first principles or a stated standard result (cite which)
- Number every step
- State assumption/approximation explicitly at each step (e.g., "For small angles, sin θ ≈ θ")
- Box the final derived result

THEORY:
- State the law/principle precisely first (verbatim or paraphrased accurately)
- Give mathematical formulation alongside verbal explanation
- State limitations and conditions of applicability (e.g., "valid only for ideal gases")
- For 15M+: include historical context (who, when, how it was discovered)

JEE/NEET STYLE NUMERICALS:
- Show substitution clearly
- Highlight answer with **bold**
- Include dimensional analysis check for complex problems

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition or law (1 precise sentence) + mathematical expression (if applicable)
- Max 2 lines. No derivation.
- Example: "**Newton's Second Law** — the net force on a body equals the rate of change of its momentum; F = ma (for constant mass)."

5 MARKS:
- Statement of law/principle → Mathematical form → Key conditions/assumptions (2–3 bullets) → One illustrative example or numerical → Conclusion
- MUST include the formula and state what each variable represents

10 MARKS:
- Full structure: Statement → Mathematical formulation → Derivation (key steps) → Diagram (FBD/P-V/ray diagram) → Numerical example with full working → Applications (2–3) → Limitations/Exceptions → Conclusion
- Derivation or working/flow steps are mandatory
- Diagram is mandatory (FBD, circuit diagram, ray diagram, P-V/T-S, etc.)

15 MARKS:
- All sections of 10M + Extended derivation from first principles + Two numerical examples (one straightforward, one involving a twist) + Comparison with related concept
- State limitations/validity conditions explicitly

20 MARKS:
- Exhaustive: Statement → First-principles derivation → Full diagram → Multiple numerical examples → Applications in technology and nature → Limitations → Modern relevance (quantum, relativistic corrections where applicable) → Conclusion
- Mandatory: derivation with every step numbered
- Mandatory: at least two fully worked numerical problems
- Mandatory: diagram with all components labeled
`;
