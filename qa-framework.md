# Claude.md — Feature Testing & Critic Agent Framework

## Purpose

This document defines a structured testing and validation system using a **Critic Agent** to rigorously evaluate new features, updates, and system behavior.

The goal is to ensure:

- All features work as expected
- No regressions are introduced
- Outputs meet quality standards (accuracy, structure, clarity)
- Errors are clearly identified and actionable

---

## System Overview

### 1. Developer / System Under Test (SUT)

- Implements new features, updates, or fixes
- Produces outputs based on user prompts

### 2. Test Agent

- Generates test cases
- Executes feature-specific scenarios
- Captures outputs

### 3. Critic Agent (STRICT REVIEWER)

- Evaluates outputs against predefined criteria
- Detects errors, inconsistencies, or deviations
- Provides structured feedback
- Approves or rejects test results

---

## Testing Workflow

1. Define Feature / Update
2. Generate Test Cases
3. Execute Tests
4. Collect Outputs
5. Critic Agent Review
6. Report Results
7. Iterate / Fix Issues

---

## Test Case Structure

Each test case must follow this format:

```
Test ID:
Feature:
Description:
Input Prompt:
Expected Behavior:
Constraints:
Evaluation Criteria:
```

---

## Execution Format

```
[Test Execution]
Input:
Output:

[Critic Review]
Status: PASS / FAIL
Score: X/10

Issues Found:
- Issue 1
- Issue 2

Suggestions:
- Improvement 1
- Improvement 2
```

---

## Critic Agent Rules (STRICT MODE)

The Critic Agent MUST:

1. Be highly strict and unbiased
2. Never assume correctness
3. Penalize:
   - Missing requirements
   - Incorrect structure
   - Low clarity
   - Hallucinations
   - Irrelevant content

4. Validate against:
   - Expected behavior
   - Constraints
   - Output format

5. Provide:
   - Clear reasoning
   - Specific error locations
   - Actionable fixes

---

## Evaluation Criteria

### 1. Functional Correctness

- Does the feature work as intended?

### 2. Output Accuracy

- Is the information correct?

### 3. Structure Compliance

- Does it follow the required format?

### 4. Clarity & Simplicity

- Is it easy to understand?

### 5. Completeness

- Are all parts addressed?

### 6. Robustness

- Handles edge cases?

---

## Scoring System

Each category scored out of 10:

| Category               | Score |
| ---------------------- | ----- |
| Functional Correctness | /10   |
| Accuracy               | /10   |
| Structure              | /10   |
| Clarity                | /10   |
| Completeness           | /10   |
| Robustness             | /10   |

**Final Score = Average**

---

## Failure Conditions

A test is marked **FAIL** if:

- Any critical requirement is missing
- Output is structurally incorrect
- Accuracy is compromised
- Score < 8/10

---

## Example Test Case

```
Test ID: T001
Feature: 10-Mark Answer Generator
Description: Validate structured academic output

Input Prompt:
"Explain Operating System"

Expected Behavior:
- Structured 10-mark answer
- Includes definition, explanation, examples

Constraints:
- Must follow predefined format
- No irrelevant content

Evaluation Criteria:
- Accuracy, Structure, Completeness
```

---

## Example Execution + Critic Review

```
[Test Execution]
Input:
Explain Operating System

Output:
(Generated Answer)

[Critic Review]
Status: FAIL
Score: 6.5/10

Issues Found:
- Missing structured headings
- No real-world examples
- Weak introduction

Suggestions:
- Add clear sections
- Include examples
- Improve definition clarity
```

---

## Regression Testing

For every new update:

- Re-run previous test cases
- Compare outputs
- Ensure no degradation

---

## Edge Case Testing

Include tests for:

- Ambiguous prompts
- Extremely short inputs
- Very long inputs
- Mixed-domain questions

---

## Automation Guidelines

- Store all test cases in a dataset
- Log all outputs
- Maintain version history
- Track pass/fail trends

---

## Final Goal

A **self-improving system** where:

- Features are continuously tested
- Critic Agent enforces high standards
- Output quality approaches **university-level excellence**

---

## Optional Extensions

- Multi-Critic Voting System
- Domain-specific critics (OS, DBMS, AI, etc.)
- Confidence scoring
- Auto-fix suggestions pipeline

---

END OF FILE
