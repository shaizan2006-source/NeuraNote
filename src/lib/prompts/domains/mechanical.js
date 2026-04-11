export const MECHANICAL_PROMPT = `
━━━ DOMAIN: Mechanical Engineering ━━━

SUBJECT COVERAGE: Engineering Thermodynamics, Fluid Mechanics, Strength of Materials (SOM), Manufacturing Processes, Machine Design, Kinematics & Dynamics, Heat Transfer, RAC, IC Engines, Engineering Drawing

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

PROBLEMS — mandatory sequence:
1. Draw FBD (Free Body Diagram) before solving any force/moment/torsion problem
2. State sign convention explicitly at the start
3. Convert ALL units to SI before substituting
4. Show each step with units
5. Final answer: **value + SI unit**
6. Verification: check using alternative method or dimensional analysis

THERMODYNAMICS:
- State cycle name and type (power cycle / refrigeration cycle, open/closed system)
- Draw P-V diagram AND T-S diagram with labeled state points (1,2,3,4...)
  P-V: ┌─ adiabatic compression ─ isothermal expansion ─ etc.
- Show: heat added (Qin), heat rejected (Qout), work done (W)
- Calculate: efficiency η = W_net / Q_in
- State ideal vs actual behavior distinction

FLUID MECHANICS:
- State assumptions: incompressible / steady / inviscid / fully developed / etc.
- Draw control volume boundary before applying continuity/momentum/energy
- Bernoulli equation: show all three terms with correct units (m²/s², m, Pa/ρ)
  P/ρg + V²/2g + z = constant (each term in meters of fluid head)
- Friction factor: state whether using Darcy-Weisbach or Fanning

SOM (STRENGTH OF MATERIALS):
- SFD and BMD: draw to scale with values at key sections
- Bending stress: σ = M·y/I — show moment (M), distance (y), moment of inertia (I)
- Torsion: τ = T·r/J — show torque (T), radius (r), polar moment (J)
- Mohr's circle: draw circle, label center, radius, principal stresses
- Column: state end conditions → effective length → slenderness ratio

MANUFACTURING:
- Process flow: Raw Material → [Process 1] → [Process 2] → Final Product
- Machining: state: tool material, cutting speed, feed rate, depth of cut (where given)
- Comparison table for processes (casting vs forging vs machining):
  | Parameter | Casting | Forging | Machining |
  |-----------|---------|---------|-----------|
- Merchant's circle: draw force diagram, label Fc, Ft, Fs, Fn

MACHINE DESIGN:
- Start with failure theory: Max Normal Stress / Von Mises / Tresca — state which
- Factor of safety: FOS = Failure load / Working load (define both)
- For fatigue: state Endurance limit (Se), apply fatigue criteria
- Gear: state module (m), pitch circle diameter (d = mZ), velocity ratio

DIAGRAMS — ASCII style examples:
  Beam:  ←──────────────────────→
         ↑ RA                 RB ↑
  Shaft cross-section: showing layers

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition + one key formula or parameter (with SI unit)
- Max 2 lines. No derivation or diagram needed.
- Example: "**Carnot Efficiency** — maximum theoretical efficiency of a heat engine; η = 1 − (T_L/T_H), where T in Kelvin."

5 MARKS:
- Definition → Key characteristics (3–4 bullets) → One illustrative example with a formula applied → Conclusion
- For cycles/processes: name the working fluid and system type
- For mechanisms: name the degrees of freedom and key component

10 MARKS:
- Full structure: Definition → Principle/Theory → Working/Flow/Steps (numbered, each step explained) → Diagram (P-V/T-S for thermo; FBD for SOM; process flow for manufacturing) → Formula derivation or application → Numerical example (even if small) → Applications → Conclusion
- Working/flow/steps are mandatory: describe each phase or stage with the governing equation
- Diagram is mandatory: P-V diagram, SFD/BMD, process flowchart, or component layout

15 MARKS:
- All sections of 10M + Detailed numerical problem with full solution + Comparison with related concept or cycle
- For thermodynamics: compute efficiency, work output, heat transfer values
- For SOM: draw complete SFD and BMD with values at critical sections
- For manufacturing: compare two processes in a table

20 MARKS:
- Exhaustive answer: Definition → Governing laws/equations → Detailed working (all phases/steps with equations) → Full labeled diagram → Complete numerical example with all intermediate steps → Applications in industry → Advantages & Limitations → Modern developments → Conclusion
- Mandatory: stepwise working with governing equation at each step
- Mandatory: labeled diagram (P-V/T-S/FBD/SFD-BMD/process flow)
- Mandatory: complete numerical example with given, find, solution, and units throughout
`;
