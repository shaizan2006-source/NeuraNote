// ──────────────────────────────────────────────────────────────
// Prompt Assembler — composes system + user prompts from modules
// ──────────────────────────────────────────────────────────────

import { BASE_PROMPT } from './prompts/base.js';
import { getDomainPrompt } from './prompts/domains/index.js';
import { getTemplate, QUICK_SUMMARY_INSTRUCTION } from './answerTemplates.js';

/**
 * Assemble the final system prompt and user message for the LLM.
 *
 * @param {Object} params
 * @param {Object} params.classification  — output from classifyQuery()
 * @param {string} params.context         — RAG chunks joined as string (or "")
 * @param {boolean} params.isConfused     — confusion detection flag
 * @returns {{ systemPrompt, userPrompt, temperature, maxTokens }}
 */
export function assemblePrompt({ classification, context, isConfused }) {
  const { domain, relatedDomain, marks, questionType, language } = classification;

  // ── 1. Get structure template for this marks + question type ──
  const template = getTemplate(marks, questionType);

  // ── 2. Build system prompt layers ────────────────────────────
  const systemParts = [];

  // Layer 1: Base accuracy + format rules (always first)
  systemParts.push(BASE_PROMPT);

  // Layer 2: Domain-specific instructions
  systemParts.push(getDomainPrompt(domain));

  // Layer 3: Secondary domain (for multi-domain questions)
  if (relatedDomain && relatedDomain !== domain) {
    systemParts.push(
      `\n━━━ SECONDARY DOMAIN CONTEXT ━━━\n` +
      `This question also relates to: ${relatedDomain.toUpperCase()}.\n` +
      `Where relevant, apply ${relatedDomain} conventions, terminology, and examples alongside the primary domain.`
    );
  }

  // Layer 4: Structure template for this marks level + question type
  systemParts.push(`\n━━━ ANSWER STRUCTURE (FOLLOW EXACTLY) ━━━\n${template.prompt}`);

  // Layer 5: Quick summary instruction for 10M+
  if (marks >= 10 && questionType === 'theory') {
    systemParts.push(QUICK_SUMMARY_INSTRUCTION);
  }

  // Layer 6: Confusion / simplification modifier
  if (isConfused) {
    systemParts.push(
      `\n━━━ CLARITY MODE ━━━\n` +
      `The student is confused or needs extra clarity. Apply these rules:\n` +
      `- Use simple analogies (compare to everyday objects or experiences)\n` +
      `- After each complex statement, add "In other words: [simpler version]"\n` +
      `- Break every concept into the smallest possible pieces\n` +
      `- Use shorter sentences (max 20 words per sentence)\n` +
      `- Keep the SAME section structure — do NOT skip sections\n` +
      `- Do NOT oversimplify to the point of inaccuracy`
    );
  }

  // Layer 7: Language modifier
  if (language === 'hinglish') {
    systemParts.push(
      `\n━━━ LANGUAGE: HINGLISH ━━━\n` +
      `Respond in Hinglish (Hindi + English mix).\n` +
      `- Use Hindi (Devanagari or Roman transliteration) for explanations\n` +
      `- Keep ALL technical terms in English\n` +
      `- Example: "Binary Search ek aisa algorithm hai jo sorted array mein kisi element ko dhundta hai, array ko repeatedly half karke."\n` +
      `- Section headings stay in English`
    );
  } else if (language === 'hi') {
    systemParts.push(
      `\n━━━ LANGUAGE: HINDI ━━━\n` +
      `Respond in Hindi (Devanagari script).\n` +
      `- Technical terms stay in English\n` +
      `- Section headings stay in English`
    );
  }

  const systemPrompt = systemParts.join('\n\n');

  // ── 3. Build user prompt ──────────────────────────────────────
  const userParts = [];

  if (context && context.trim().length > 0) {
    userParts.push(
      `REFERENCE MATERIAL (from student's uploaded notes):\n` +
      `─────────────────────────────────────────────────\n` +
      context.trim() +
      `\n─────────────────────────────────────────────────\n` +
      `Use this as your PRIMARY source. If the document contains multiple questions, extract and solve ALL of them sequentially. Fill any gaps using your knowledge.`
    );
  } else {
    userParts.push(
      `No reference material provided. Answer using your training knowledge.`
    );
  }

  userParts.push(
    `QUESTION (${marks} Marks — ${questionType}):\n${classification.originalQuestion}`
  );

  userParts.push(`Begin your answer now. Start with the first section immediately.`);

  const userPrompt = userParts.join('\n\n');

  // ── 4. Dynamic temperature + token limit ─────────────────────
  const TEMPERATURES = {
    problem:    0.1,
    derivation: 0.1,
    code:       0.15,
    diagram:    0.2,
    comparison: 0.2,
    definition: 0.2,
    'case-study': 0.25,
    theory:     0.25,
  };

  const temperature = TEMPERATURES[questionType] ?? 0.25;
  const maxTokens   = template.maxTokens;

  return { systemPrompt, userPrompt, temperature, maxTokens };
}
