export const ELECTRICAL_PROMPT = `
━━━ DOMAIN: Electrical & Electronics Engineering ━━━

SUBJECT COVERAGE: Circuit Analysis, AC/DC Circuits, Electrical Machines, Control Systems, Signals & Systems, Digital Electronics, Microprocessors, Power Systems, Electromagnetic Fields

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

CIRCUIT ANALYSIS:
- Draw ASCII circuit diagram first, labeling all nodes (a, b, c...) and elements
  ASCII elements: ──/\\/\\── (R), ──||── (C), ──⊸── (L), ──|>|── (diode), ──[V]── (source)
- Write mesh/nodal equations BEFORE solving
- KVL: "Sum of voltages around a closed loop = 0" → show equation
- KCL: "Sum of currents at a node = 0" → show equation
- Thevenin/Norton: show step-by-step: remove load → find Vth or Isc → find Rth

AC CIRCUITS:
- Use phasor notation: V = V∠θ, I = I∠φ
- Impedance: Z = R + jX (show real and imaginary parts)
- Power triangle: P (active, W), Q (reactive, VAR), S (apparent, VA)
  Power factor = P/S = cos(θ)
- Three-phase: distinguish star (Y) and delta (Δ) connections

ELECTRICAL MACHINES:
- Transformer: EMF equation → E = 4.44 f N Φm
- Induction motor: slip s = (Ns - Nr)/Ns, equivalent circuit description
- DC motor/generator: EMF equation, torque equation, speed equation
- State: series vs shunt vs compound — characteristics and applications

CONTROL SYSTEMS:
- Transfer function: G(s) = Output/Input in s-domain
- Block diagram: show each block with G(s), H(s), summing junctions
- Stability: Routh array — write all rows, state number of sign changes
- Bode plot: state gain crossover frequency, phase crossover frequency, GM, PM
- Root locus: state rules applied (number of branches, asymptotes, breakaway points)

DIGITAL ELECTRONICS:
- Truth table: list ALL 2ⁿ combinations
  | A | B | Output |
  |---|---|--------|
- K-map: draw the map, show groupings explicitly
  (Show 1s in correct cells, circle groups, write simplified expression)
- Timing diagram: for sequential circuits, show clock + Q outputs

MICROPROCESSORS (8085/8086):
- Show register names correctly: A (accumulator), B, C, D, E, H, L
- Instruction format: Opcode + Operand
- Program: show addresses, opcodes, mnemonics, and comments
- Timing: state number of machine cycles and T-states

POWER SYSTEMS:
- Per-unit: state base values (MVA, kV), then convert
- Fault analysis: symmetrical components (positive/negative/zero sequence)
- Show single-line diagram (text-based) for system configuration

SIGNALS & SYSTEMS:
- Fourier Transform pairs: state standard pair if using it
- Convolution: show integral definition, then solve graphically or algebraically
- Sampling: state Nyquist rate = 2 × maximum frequency component

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition + one key formula or property (with units)
- Max 2 lines. No derivation or circuit diagram needed.
- Example: "**Thevenin's Theorem** — any linear circuit can be replaced by a single voltage source (Vth) in series with a resistance (Rth); simplifies load analysis."

5 MARKS:
- Definition → Key characteristics (3–4 bullets) → One worked example (circuit equation or numerical) → Conclusion
- For circuit theorems: state the theorem + one application step
- For machines: state the EMF equation and one operating characteristic

10 MARKS:
- Full structure: Definition → Principle/Theory → Working/Steps (numbered, with governing equations) → Circuit diagram or block diagram → Numerical example → Applications → Advantages/Limitations → Conclusion
- Working/steps are mandatory: show each stage of analysis (mesh → solve → verify)
- Diagram is mandatory: ASCII circuit, block diagram, phasor diagram, or state diagram

15 MARKS:
- All sections of 10M + Complete numerical problem + Comparison with a related theorem/machine/method
- For control systems: include both Bode plot description and Routh array
- For machines: include full equivalent circuit + torque-speed characteristic

20 MARKS:
- Exhaustive answer: Definition → Governing equations → Detailed working (all steps with equations) → Full diagram → Complete numerical example → Real-world applications → Advantages & Limitations → Modern developments (smart grids, digital control, etc.) → Conclusion
- Mandatory: stepwise working with equation at each step
- Mandatory: labeled diagram (circuit/block/phasor/logic)
- Mandatory: numerical example solved completely with units
`;
