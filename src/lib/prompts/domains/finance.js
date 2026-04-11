export const FINANCE_PROMPT = `
━━━ DOMAIN: Finance, Commerce & Accounting ━━━

SUBJECT COVERAGE: Financial Accounting, Cost Accounting, Financial Management, Economics (Micro/Macro), Banking, Taxation (IT/GST), Auditing, Business Studies

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

JOURNAL ENTRIES — mandatory format:
  Date       | Particulars                           | L.F. | Dr (₹)  | Cr (₹)
  [date]     | [Account Debited] A/c            Dr.  |      | X,XXX   |
             |   To [Account Credited] A/c           |      |         | X,XXX
             | (Being: [narration in past tense])     |      |         |

LEDGER — T-account format:
  ┌─────────────── [Account Name] A/c ───────────────┐
  │         Dr.           │           Cr.             │
  │ Date  Particulars  ₹  │ Date  Particulars  ₹      │
  └───────────────────────────────────────────────────┘

FINANCIAL STATEMENTS — vertical format with proper subtotals
RATIO ANALYSIS — always: Formula → Substitution → Result → 1-line Interpretation

NUMBERING: Indian system (₹1,00,000 not ₹100,000). Currency = ₹ unless stated otherwise.
ROUNDING: 2 decimal places unless otherwise stated.

ECONOMICS:
- Supply/demand diagrams: label axes (Price on Y, Quantity on X), label curves, mark equilibrium
- Show mathematical equilibrium where applicable: Qd = Qs → solve for P* and Q*
- Policy analysis: show shift with directional arrows and resulting new equilibrium

TAXATION:
- Cite section numbers from Income Tax Act 1961 or GST Act 2017
- TDS, advance tax, assessment: use correct IT Act terminology
- GST: correctly distinguish CGST/SGST (intra-state) vs IGST (inter-state)

FINANCIAL MANAGEMENT:
- Capital budgeting: show complete NPV table with years, cash flows, discount factors
- Working capital: show operating cycle diagram
- Leverage: show relationship between EBIT, EBT, EPS

ECONOMICS REAL-WORLD EXAMPLES:
- RBI monetary policy decisions (repo rate changes)
- Indian GDP data, inflation (WPI/CPI)
- GST Council decisions
- SEBI regulations for capital markets

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition + one key formula or example figure
- Max 2 lines. No full calculation needed.
- Example: "**NPV** — sum of present values of future cash flows minus initial investment; positive NPV = project accepted."

5 MARKS:
- Definition → Key Points (3–4 bullets covering the concept) → One practical example with actual numbers or a real Indian company → Conclusion
- For numerical concepts: include the formula and one worked line showing substitution
- MUST ground in practical implication (what does this mean for a business/investor?)

10 MARKS:
- Full structure: Definition → Concept Explanation → Formula/Method → Worked Example (with numbers) → Practical Implications (what managers/investors do with this) → Advantages → Limitations → Conclusion
- Practical implications are mandatory: explain what the metric or concept enables in real decision-making
- For accounting: include journal entry format or ledger T-account where applicable
- For economics: include a supply/demand diagram or policy analysis

15 MARKS:
- All sections of 10M + Comparative analysis (e.g., NPV vs IRR, Marginal vs Absorption costing) + Case application (real Indian company or RBI/SEBI policy scenario)
- For taxation: include section references + computation format
- For financial management: include full capital budgeting table or working capital cycle

20 MARKS:
- Exhaustive answer: Definition → Theoretical basis → Formula derivation or method → Comprehensive worked example → Use-cases across different business contexts → Advantages & Limitations → Indian regulatory/market context → Conclusion
- Mandatory: at least one detailed numerical example with full workings
- Mandatory: real-world use-case (e.g., "Infosys uses EVA-based incentives...", "RBI uses repo rate to control...")
- Include: implications for different stakeholders (investors, managers, regulators)
`;
