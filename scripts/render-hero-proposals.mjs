/**
 * render-hero-proposals.mjs — Stage 8h landing hero directions (§10 founder pick).
 * 3 static high-fidelity mockups at 1440px. Output: __screens__/stage-8h-proposals/hero-{a,b,c}.png
 */
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-8h-proposals");

const T = `--bg-base:#08080A;--bg-elevated:#0E0E11;--bg-surface:#131317;--bg-surface-2:#1A1A1F;--bg-inset:#050506;
--border-hairline:rgba(255,255,255,0.06);--border-strong:rgba(255,255,255,0.12);
--text-primary:#F5F5F4;--text-secondary:#A1A1A6;--text-tertiary:#6B6B70;
--accent:#D4AF6E;--accent-bright:#EACF96;--accent-dim:#9A7E44;--accent-grad:linear-gradient(135deg,#EACF96 0%,#D4AF6E 100%);`;

const MARK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">
  <path d="M8 26V8a2 2 0 0 1 2-2h9l5 5v9" stroke="#F5F5F4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 6v5h5" stroke="#F5F5F4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 25.5 L16 19 L19 25.5" stroke="#F5F5F4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="16" cy="16.1" r="1.7" fill="#D4AF6E"/></svg>`;

const CSS = `*{box-sizing:border-box;margin:0}body{background:var(--bg-base);color:var(--text-primary);font:15px/1.5 -apple-system,"Segoe UI",sans-serif}
  .nav{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;z-index:10}
  .nav .brand{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:-0.01em}
  .nav .links{display:flex;align-items:center;gap:18px;font-size:14px;color:var(--text-secondary)}
  .startbtn{background:var(--accent-grad);color:var(--bg-base);padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600}
  .badge{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--accent-dim);color:var(--accent);border-radius:999px;padding:6px 16px;font-size:12px;font-weight:600}
  .h1{font-weight:600;letter-spacing:-0.02em;line-height:1.08}
  .sub{color:var(--text-secondary);line-height:1.6}
  .cta{display:inline-flex;align-items:center;gap:8px;background:var(--accent-grad);color:var(--bg-base);padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;box-shadow:0 4px 24px rgba(212,175,110,0.18)}
  .ghost{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border-strong);color:var(--text-secondary);padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600}
  .lbl{position:fixed;top:12px;left:16px;font:11px ui-monospace,monospace;color:var(--text-tertiary);z-index:50}`;

function constellation(w, h) {
  const nodes = [[12,20],[30,12],[52,22],[74,14],[88,28],[22,52],[44,40],[66,54],[84,60],[36,74],[60,80]];
  const links = [[0,1],[1,2],[2,3],[3,4],[0,5],[2,6],[6,7],[4,8],[5,9],[7,10]];
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.5">
    ${links.map(([a,b])=>`<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="#D4AF6E" stroke-opacity="0.35" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join("")}
    ${nodes.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3===0?0.45:0.3}" fill="#EACF96"/>`).join("")}
  </svg>`;
}
const glow = (x,y,s)=>`<div style="position:absolute;top:${y};left:${x};transform:translate(-50%,-50%);width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,110,0.14) 0%,transparent 70%);pointer-events:none"></div>`;
const NAV = `<div class="nav"><div class="brand"><span style="color:var(--text-primary)">${MARK(26)}</span>Ask My Notes</div>
  <div class="links"><span>Pricing</span><span>Log in</span><span class="startbtn">Start Free</span></div></div>`;

// A — Constellation Hero (centered, brand-signature backdrop)
const A = `${NAV}
<section style="min-height:760px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden;padding:0 24px">
  ${constellation()} ${glow("50%","42%",640)}
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center">
    <div style="margin-bottom:26px">${MARK(64)}</div>
    <div class="badge" style="margin-bottom:24px">Built for JEE · NEET · India's hardest exams</div>
    <h1 class="h1" style="font-size:60px;max-width:760px;margin-bottom:20px">Your notes that <span style="color:var(--accent)">answer back.</span></h1>
    <p class="sub" style="font-size:18px;max-width:540px;margin-bottom:36px">Upload your notes, ask Sage, and master more in less time. AI Brain Map, daily briefings, and 1000+ official PYQs.</p>
    <div style="display:flex;gap:12px"><span class="cta">Start free 7-day trial →</span><span class="ghost">See how it works</span></div>
  </div>
</section>`;

// B — Product Peek (split: copy left, product frame right)
const B = `${NAV}
<section style="min-height:760px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:48px;position:relative;overflow:hidden;padding:0 64px">
  ${glow("28%","45%",520)}
  <div style="position:relative;z-index:1">
    <div class="badge" style="margin-bottom:22px">Built for JEE · NEET</div>
    <h1 class="h1" style="font-size:54px;max-width:560px;margin-bottom:20px">Remember everything you study. <span style="color:var(--accent)">Ace JEE &amp; NEET.</span></h1>
    <p class="sub" style="font-size:17px;max-width:460px;margin-bottom:32px">Your AI study companion that reads your notes and answers exam questions instantly.</p>
    <div style="display:flex;gap:12px"><span class="cta">Start free 7-day trial →</span><span class="ghost">See how it works</span></div>
  </div>
  <div style="position:relative;z-index:1">
    <div style="background:var(--bg-surface);border:1px solid var(--accent-dim);border-radius:16px;padding:20px;box-shadow:0 24px 64px rgba(0,0,0,0.5),0 0 32px rgba(212,175,110,0.08)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">${MARK(24)}<div><div style="font-size:13px;font-weight:600">Sage</div><div style="font-size:10px;color:var(--text-tertiary)">your notes that answer back</div></div></div>
      <div style="background:var(--bg-surface-2);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:10px;align-self:flex-end;max-width:80%;margin-left:auto">What is Ohm's law?</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.6"><span style="color:var(--accent);font-weight:600">Ohm's Law</span> states that current (I) through a conductor is directly proportional to voltage (V): <span style="color:var(--text-primary)">V = I × R</span>.</div>
      <div style="margin-top:14px;display:flex;gap:6px"><svg width="110" height="40" viewBox="0 0 150 64"><line x1="18" y1="44" x2="58" y2="18" stroke="#D4AF6E" stroke-opacity="0.5"/><line x1="58" y1="18" x2="102" y2="38" stroke="#D4AF6E" stroke-opacity="0.5"/><line x1="102" y1="38" x2="136" y2="14" stroke="#D4AF6E" stroke-opacity="0.5"/><circle cx="18" cy="44" r="3" fill="#EACF96"/><circle cx="58" cy="18" r="3" fill="#EACF96"/><circle cx="102" cy="38" r="3" fill="#EACF96"/><circle cx="136" cy="14" r="3" fill="#EACF96"/></svg></div>
    </div>
  </div>
</section>`;

// C — Minimal Statement (huge type, negative space, one CTA)
const C = `${NAV}
<section style="min-height:760px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden;padding:0 24px">
  ${glow("50%","50%",460)}
  <div style="position:relative;z-index:1">
    <div style="margin-bottom:32px;display:flex;justify-content:center">${MARK(40)}</div>
    <h1 class="h1" style="font-size:84px;max-width:900px;margin-bottom:28px">Your notes,<br/><span style="color:var(--accent)">answered.</span></h1>
    <p class="sub" style="font-size:17px;max-width:440px;margin:0 auto 40px">The AI study companion for JEE &amp; NEET. Ask Sage anything from your own notes.</p>
    <span class="cta">Start free 7-day trial →</span>
    <p style="margin-top:20px;font-size:12px;color:var(--text-tertiary)">No credit card · 7-day Pro trial · 1000+ official PYQs</p>
  </div>
</section>`;

const PAGES = [["hero-a","A · Constellation Hero — brand-signature star-field, centered, 'answer back'",A],
  ["hero-b","B · Product Peek — split; copy left, live Sage answer card right",B],
  ["hero-c","C · Minimal Statement — huge type, max negative space, single CTA",C]];

async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();const pg=await b.newPage({deviceScaleFactor:1});
  for(const [slug,label,body] of PAGES){
    await pg.setViewportSize({width:1440,height:800});
    await pg.setContent(`<!doctype html><html><head><style>:root{${T}} ${CSS}</style></head><body><div class="lbl">${label}</div>${body}</body></html>`);
    await pg.waitForTimeout(150);
    await pg.screenshot({path:path.join(OUT,`${slug}.png`),fullPage:true});
    console.log("  ✓",slug);
  }
  await b.close();console.log("✅ hero proposals rendered");
}
main().catch(e=>{console.error(e);process.exit(1)});
