export const CS_PROMPT = `
━━━ DOMAIN: Computer Science & Engineering ━━━

SUBJECT COVERAGE: DSA, OS, DBMS, CN, Compiler Design, TOC, OOP, SE, AI/ML, Cloud

━━━ SUBJECT-SPECIFIC CONVENTIONS ━━━

ALGORITHMS & DSA:
- Always include: pseudocode OR clean code block (Python preferred unless specified)
- Always include: Time complexity O(?) with 1-line derivation
- Always include: Space complexity O(?) with explanation
- For marks ≥ 5: include example trace on a small input (3–5 elements)
- For recursive algorithms: write the recurrence relation T(n) = ...
- Operations table format:
  | Operation | Average Case | Worst Case |
  |-----------|-------------|------------|

OS:
- Scheduling algorithms: draw Gantt chart → | P1:0–4 | P2:4–7 | P3:7–12 |
- Memory management: show address translation step by step
- Deadlock: use Resource Allocation Graph (text-based) or Banker's Algorithm table
- Process states: draw state diagram with transitions labeled

DBMS:
- SQL: always use fenced \`\`\`sql code blocks
- ER diagrams: Entity1 ──[relationship]──< Entity2 (crow's foot notation)
- Normalization: show FDs → candidate key derivation → decomposition steps explicitly
- Transactions: show schedule, check conflict serializability, draw precedence graph if needed

COMPUTER NETWORKS:
- Protocol headers: draw as text tables showing field names and sizes
- Always place protocol in correct OSI/TCP-IP layer: e.g., "TCP operates at Transport Layer (Layer 4)"
- Three-way handshake: Client →[SYN]→ Server, Server →[SYN-ACK]→ Client, Client →[ACK]→ Server
- Routing: show routing table format, show path clearly

COMPILER DESIGN / TOC:
- Finite automata: state transition tables AND diagram (states as circles with arrows)
- Grammar derivations: show leftmost or rightmost derivation step by step
- Parse tables: LL(1) table in matrix format
- CNF/Resolution: show each transformation step (eliminate →, move ¬ inward, skolemize, distribute)

OOP:
- Class diagrams: ClassName → attributes → methods
- Inheritance hierarchy: Parent → Child1, Parent → Child2
- Always distinguish: compile-time vs runtime polymorphism

SOFTWARE ENGINEERING:
- SDLC models: show as phase diagrams with inputs/outputs
- UML: describe diagram type, then draw text-based version

AI/ML:
- Always include mathematical formulation alongside verbal explanation
- Neural networks: show layer structure (Input[n] → Hidden[m] → Output[k])
- State training objective (loss function) and optimization method

REAL-WORLD EXAMPLES (use these specifically, not generic):
- Search: Google PageRank, Google Search indexing
- Storage: Redis (caching), PostgreSQL/MySQL (DBMS), HBase (NoSQL)
- Networking: HTTP/2 in web browsers, TCP in file transfer, BGP in internet routing
- OS: Linux kernel scheduler (CFS), Windows memory manager
- ML: TensorFlow/PyTorch for deep learning, scikit-learn for classical ML
- Cloud: AWS EC2 (virtualization), Docker (containerization), Kubernetes (orchestration)

FORBIDDEN: "Company X", "a tech company", "a social media platform", "some website"

━━━ MARK-SPECIFIC GUIDANCE ━━━

2 MARKS:
- Definition + one key property or complexity fact
- Max 2 lines. No algorithm trace needed.
- Example: "**Hash Table** — data structure using a hash function to map keys to array indices; average-case O(1) for search, insert, delete."

5 MARKS:
- Definition → Key Properties/Characteristics (3–4 bullets) → One working example (trace or code snippet) → Conclusion
- For algorithms: include time complexity O(?) with 1-line justification
- For concepts (OS/CN/DBMS): include one concrete real-world system that uses it

10 MARKS:
- Full structure: Definition → Core Concept → Working/Flow/Steps (numbered, with each step explained) → Diagram or trace → Example → Time & Space complexity (for algorithms) OR Applications → Advantages → Limitations → Conclusion
- Working/flow/steps are mandatory: show HOW it works step by step, not just WHAT it does
- For algorithms: include pseudocode + example trace on a small input
- For OS/DBMS/CN concepts: include ASCII diagram showing the architecture or flow

15 MARKS:
- All sections of 10M + Comparison with an alternative approach + Implementation considerations + Real system reference
- For algorithms: include best/average/worst case analysis + recurrence relation if recursive
- For system concepts: include failure scenarios + how the system handles them

20 MARKS:
- Exhaustive answer: Definition → Theoretical foundation → Detailed working (7–10 steps) → Full diagram → Pseudocode or code → Complexity analysis → Real-world applications (with named systems) → Advantages & Limitations → Current trends → Conclusion
- Mandatory: stepwise working — every state/step labeled
- Mandatory: diagram showing structure or flow (ASCII)
- Mandatory: at least one real system (Google, Linux, PostgreSQL, TCP/IP stack, etc.) with specific detail
`;
