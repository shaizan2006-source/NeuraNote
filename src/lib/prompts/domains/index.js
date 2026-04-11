import { CS_PROMPT } from './cs.js';
import { LAW_PROMPT } from './law.js';
import { FINANCE_PROMPT } from './finance.js';
import { PHYSICS_PROMPT } from './physics.js';
import { CHEMISTRY_PROMPT } from './chemistry.js';
import { MATH_PROMPT } from './math.js';
import { BIOLOGY_PROMPT } from './biology.js';
import { MECHANICAL_PROMPT } from './mechanical.js';
import { ELECTRICAL_PROMPT } from './electrical.js';
import { MEDICAL_PROMPT } from './medical.js';
import { BUSINESS_PROMPT } from './business.js';
import { GENERAL_PROMPT } from './general.js';

const DOMAIN_PROMPTS = {
  cs:         CS_PROMPT,
  law:        LAW_PROMPT,
  finance:    FINANCE_PROMPT,
  physics:    PHYSICS_PROMPT,
  chemistry:  CHEMISTRY_PROMPT,
  math:       MATH_PROMPT,
  biology:    BIOLOGY_PROMPT,
  mechanical: MECHANICAL_PROMPT,
  electrical: ELECTRICAL_PROMPT,
  medical:    MEDICAL_PROMPT,
  business:   BUSINESS_PROMPT,
  general:    GENERAL_PROMPT,
};

export function getDomainPrompt(domain) {
  return DOMAIN_PROMPTS[domain] || GENERAL_PROMPT;
}
