// Amounts in paise (1 INR = 100 paise)
export const PRICING_AMOUNTS = {
  student: { monthly: 19900, yearly: 159900 },
  pro:     { monthly: 39900, yearly: 299900 },
  proplus: { monthly: 69900, yearly: 599900 },  // Pro+ with unlimited voice — launch behind VOICE_PROPLUS_ENABLED
  family:  { yearly: 449900 },
};

export function getAmount(tier, cycle) {
  const tierPrices = PRICING_AMOUNTS[tier];
  if (!tierPrices) return null;
  return tierPrices[cycle] ?? null;
}

export function computeExpiry(cycle) {
  const days = cycle === "yearly" ? 365 : cycle === "monthly" ? 30 : 365;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
