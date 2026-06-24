/**
 * verify-auth-flow.mjs — Stage 7 acceptance probe.
 * Confirms the re-skinned auth pages still WORK: a real email+password login
 * lands on /dashboard, the forgot-password form submits to its "sent" state,
 * and signup renders its form. Presentation changed; logic must be intact.
 */
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = "http://localhost:3000";
function creds(){ if(process.env.TEST_EMAIL)return; const p=path.resolve(__dirname,"..",".env.local"); if(!fs.existsSync(p))return; for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^(TEST_EMAIL|TEST_PASSWORD)\s*=\s*"?([^"\r]+)"?/); if(m)process.env[m[1]]=process.env[m[1]]||m[2];}}
creds();
const b = await chromium.launch();
const pg = await b.newPage({ viewport:{width:1440,height:900} });
let pass = true;

// 1. Real login → /dashboard
try {
  await pg.goto(`${APP}/login`,{waitUntil:"domcontentloaded",timeout:30000});
  await pg.waitForLoadState("networkidle",{timeout:20000}).catch(()=>{});
  await pg.waitForTimeout(500);
  await pg.fill('input[type=email]', process.env.TEST_EMAIL);
  await pg.fill('input[type=password]', process.env.TEST_PASSWORD);
  await pg.click('button[type=submit]');
  await pg.waitForURL(u=>u.pathname.startsWith("/dashboard"),{timeout:45000});
  console.log("  ✓ login → /dashboard (email+password works)");
} catch(e){ pass=false; console.error("  ✗ login failed:", e.message.split("\n")[0]); }

// 2. Forgot-password form submits to "sent" state (use a dummy email; generic success)
try {
  const p2 = await b.newPage({ viewport:{width:1440,height:900} });
  await p2.goto(`${APP}/forgot-password`,{waitUntil:"domcontentloaded",timeout:30000});
  await p2.waitForLoadState("networkidle",{timeout:15000}).catch(()=>{});
  await p2.waitForTimeout(400);
  await p2.fill('input[type=email]', "probe@example.com");
  await p2.click('button[type=submit]');
  await p2.waitForFunction(() => /check your inbox/i.test(document.body.innerText), { timeout: 15000 });
  console.log("  ✓ forgot-password → 'check your inbox' state");
  await p2.close();
} catch(e){ pass=false; console.error("  ✗ forgot-password failed:", e.message.split("\n")[0]); }

// 3. Signup form renders (email + password + confirm + google)
try {
  const p3 = await b.newPage({ viewport:{width:1440,height:900} });
  await p3.goto(`${APP}/signup`,{waitUntil:"domcontentloaded",timeout:30000});
  await p3.waitForLoadState("networkidle",{timeout:15000}).catch(()=>{});
  const inputs = await p3.locator('input').count();
  const hasGoogle = await p3.locator('button:has-text("Google")').count();
  if (inputs >= 3 && hasGoogle >= 1) console.log(`  ✓ signup renders (${inputs} inputs, Google btn)`);
  else { pass=false; console.error(`  ✗ signup incomplete (${inputs} inputs, google=${hasGoogle})`); }
  await p3.close();
} catch(e){ pass=false; console.error("  ✗ signup failed:", e.message.split("\n")[0]); }

await b.close();
console.log(pass ? "\n✅ Auth flows intact after re-skin" : "\n✗ Auth verification FAILED");
process.exit(pass ? 0 : 1);
