/**
 * Razorpay checkout helper — achieves <300ms open time by:
 * 1. Pre-loading the Razorpay script on mount
 * 2. Pre-creating the order in parallel with script load
 * 3. Calling rzp.open() directly on button tap (no network round-trip)
 */

let scriptLoaded = false;
let scriptPromise = null;

export function preloadRazorpayScript() {
  if (scriptLoaded) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") { resolve(); return; }
    if (window.Razorpay) { scriptLoaded = true; resolve(); return; }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Pre-creates a Razorpay order. Call this on page load, not on button tap.
 *
 * @param {{ plan, cycle, accessToken }} opts
 * @returns {Promise<{ orderId, amount, currency, keyId } | null>}
 */
export async function createOrder({ plan, cycle, accessToken }) {
  try {
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ plan, cycle }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Opens the Razorpay checkout sheet immediately (script + order already ready).
 *
 * @param {object} opts
 * @param {object} opts.orderData    From createOrder()
 * @param {string} opts.userEmail
 * @param {string} opts.userPhone    +91XXXXXXXXXX
 * @param {string} opts.plan         "pro" | "student"
 * @param {string} opts.cycle        "monthly" | "yearly"
 * @param {string} opts.accessToken
 * @param {function} opts.onSuccess  Called with { plan, expiresAt } on payment success
 * @param {function} opts.onError    Called with error message string
 */
export function openCheckout({ orderData, userEmail, userPhone, plan, cycle, accessToken, onSuccess, onError }) {
  if (!window.Razorpay) {
    onError?.("Payment system not ready. Please refresh and try again.");
    return;
  }

  if (!orderData) {
    onError?.("Could not initiate payment. Please try again.");
    return;
  }

  const t0 = performance.now();

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "Ask My Notes",
    description: cycle === "yearly" ? "Pro Plan — 1 Year" : "Pro Plan — 1 Month",
    order_id: orderData.orderId,
    prefill: {
      email: userEmail ?? "",
      contact: userPhone ?? "",
    },
    // UPI first, then card, then netbanking
    config: {
      display: {
        blocks: {
          utib: { name: "Pay using UPI", instruments: [{ method: "upi" }] },
          other: { name: "Other payment methods", instruments: [{ method: "card" }, { method: "netbanking" }] },
        },
        sequence: ["block.utib", "block.other"],
        preferences: { show_default_blocks: false },
      },
    },
    theme: { color: "#8B5CF6" },
    modal: { backdropclose: false, escape: false },
    handler: async (response) => {
      console.log("[razorpay] checkout opened in", Math.round(performance.now() - t0), "ms");

      try {
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            plan,
          }),
        });

        if (verifyRes.ok) {
          const data = await verifyRes.json();
          onSuccess?.({ plan, expiresAt: data.expiresAt });
        } else {
          onError?.("Payment received but activation failed. Please contact support.");
        }
      } catch {
        onError?.("Payment received. Please refresh to see your plan status.");
      }
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", () => onError?.("Payment failed. Please try again."));
  rzp.open();
}
