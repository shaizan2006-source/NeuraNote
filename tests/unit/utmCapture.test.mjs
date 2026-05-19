/**
 * Unit tests for src/lib/utmCapture.js
 *
 * The module guards against window/sessionStorage being undefined,
 * so we stub them in the test environment.
 */
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── sessionStorage stub ─────────────────────────────────────────────────────
class FakeStorage {
  constructor() { this._store = {}; }
  getItem(k)     { return Object.hasOwn(this._store, k) ? this._store[k] : null; }
  setItem(k, v)  { this._store[k] = String(v); }
  removeItem(k)  { delete this._store[k]; }
  clear()        { this._store = {}; }
}

const fakeStorage = new FakeStorage();

// ── window / document stub ──────────────────────────────────────────────────
const fakeWindow = {
  location: { search: "", pathname: "/" },
  sessionStorage: fakeStorage,
};
const fakeDocument = { referrer: "" };

before(() => {
  global.window   = fakeWindow;
  global.document = fakeDocument;
  global.sessionStorage = fakeStorage;
});

after(() => {
  delete global.window;
  delete global.document;
  delete global.sessionStorage;
});

beforeEach(() => {
  fakeStorage.clear();
  fakeWindow.location.search   = "";
  fakeWindow.location.pathname = "/";
  fakeDocument.referrer        = "";
});

// ── Import after stubs are in place ────────────────────────────────────────
const {
  captureUtm,
  getStoredUtm,
  clearStoredUtm,
  utmToProfileFields,
} = await import("../../src/lib/utmCapture.js");

// ── T-UTM-001: captureUtm ─────────────────────────────────────────────────
describe("T-UTM-001: captureUtm — reading URL params", () => {
  it("stores utm_source from URL", () => {
    fakeWindow.location.search = "?utm_source=product_hunt";
    captureUtm();
    assert.equal(getStoredUtm().utm_source, "product_hunt");
  });

  it("stores all five UTM params when present", () => {
    fakeWindow.location.search =
      "?utm_source=reddit&utm_medium=social&utm_campaign=week16&utm_content=jee_post&utm_term=jee";
    captureUtm();
    const utm = getStoredUtm();
    assert.equal(utm.utm_source,   "reddit");
    assert.equal(utm.utm_medium,   "social");
    assert.equal(utm.utm_campaign, "week16");
    assert.equal(utm.utm_content,  "jee_post");
    assert.equal(utm.utm_term,     "jee");
  });

  it("does nothing when no UTM params in URL", () => {
    fakeWindow.location.search = "?page=1&sort=recent";
    captureUtm();
    assert.deepEqual(getStoredUtm(), {});
  });

  it("first-touch: does NOT overwrite existing stored UTM", () => {
    fakeWindow.location.search = "?utm_source=product_hunt";
    captureUtm();

    fakeWindow.location.search = "?utm_source=reddit";
    captureUtm();

    assert.equal(getStoredUtm().utm_source, "product_hunt");
  });

  it("stores landing_page from pathname", () => {
    fakeWindow.location.search   = "?utm_source=email";
    fakeWindow.location.pathname = "/pricing";
    captureUtm();
    assert.equal(getStoredUtm().landing_page, "/pricing");
  });

  it("stores referrer_url from document.referrer", () => {
    fakeWindow.location.search = "?utm_source=google";
    fakeDocument.referrer      = "https://google.com/search?q=jee+ai";
    captureUtm();
    assert.equal(getStoredUtm().referrer_url, "https://google.com/search?q=jee+ai");
  });

  it("truncates utm_source at 200 chars", () => {
    const long = "x".repeat(300);
    fakeWindow.location.search = `?utm_source=${long}`;
    captureUtm();
    assert.equal(getStoredUtm().utm_source?.length, 200);
  });

  it("stores captured_at timestamp", () => {
    fakeWindow.location.search = "?utm_source=twitter";
    captureUtm();
    assert.ok(getStoredUtm().captured_at);
  });
});

// ── T-UTM-002: getStoredUtm ───────────────────────────────────────────────
describe("T-UTM-002: getStoredUtm — retrieval", () => {
  it("returns empty object when nothing stored", () => {
    assert.deepEqual(getStoredUtm(), {});
  });

  it("returns stored object after captureUtm", () => {
    fakeWindow.location.search = "?utm_source=email_launch";
    captureUtm();
    const utm = getStoredUtm();
    assert.equal(utm.utm_source, "email_launch");
  });

  it("handles corrupted sessionStorage gracefully", () => {
    fakeStorage.setItem("amn_utm", "not-valid-json{{{");
    assert.doesNotThrow(() => getStoredUtm());
    assert.deepEqual(getStoredUtm(), {});
  });
});

// ── T-UTM-003: clearStoredUtm ─────────────────────────────────────────────
describe("T-UTM-003: clearStoredUtm — cleanup", () => {
  it("removes stored UTM after call", () => {
    fakeWindow.location.search = "?utm_source=product_hunt";
    captureUtm();
    assert.ok(getStoredUtm().utm_source);

    clearStoredUtm();
    assert.deepEqual(getStoredUtm(), {});
  });

  it("does not throw when nothing is stored", () => {
    assert.doesNotThrow(() => clearStoredUtm());
  });

  it("allows recapture after clear (new session/source)", () => {
    fakeWindow.location.search = "?utm_source=product_hunt";
    captureUtm();
    clearStoredUtm();

    fakeWindow.location.search = "?utm_source=reddit";
    captureUtm();
    assert.equal(getStoredUtm().utm_source, "reddit");
  });
});

// ── T-UTM-004: utmToProfileFields ────────────────────────────────────────
describe("T-UTM-004: utmToProfileFields — DB mapping", () => {
  it("maps utm_source → referral_source", () => {
    const fields = utmToProfileFields({ utm_source: "product_hunt" });
    assert.equal(fields.referral_source, "product_hunt");
  });

  it("maps utm_medium correctly", () => {
    const fields = utmToProfileFields({ utm_medium: "social" });
    assert.equal(fields.utm_medium, "social");
  });

  it("maps utm_campaign correctly", () => {
    const fields = utmToProfileFields({ utm_campaign: "week15_ph" });
    assert.equal(fields.utm_campaign, "week15_ph");
  });

  it("maps referrer_url correctly", () => {
    const fields = utmToProfileFields({ referrer_url: "https://producthunt.com" });
    assert.equal(fields.referrer_url, "https://producthunt.com");
  });

  it("returns null for missing fields", () => {
    const fields = utmToProfileFields({});
    assert.equal(fields.referral_source, null);
    assert.equal(fields.utm_medium,      null);
    assert.equal(fields.utm_campaign,    null);
    assert.equal(fields.referrer_url,    null);
  });

  it("returns null for undefined fields, not undefined", () => {
    const fields = utmToProfileFields({ utm_source: "x" });
    assert.equal(fields.utm_medium,   null);
    assert.equal(fields.utm_campaign, null);
  });

  it("maps all four fields in a complete UTM object", () => {
    const fields = utmToProfileFields({
      utm_source:   "creator_sharma",
      utm_medium:   "youtube",
      utm_campaign: "week13_beta",
      referrer_url: "https://youtube.com/watch?v=abc",
    });
    assert.deepEqual(fields, {
      referral_source: "creator_sharma",
      utm_medium:      "youtube",
      utm_campaign:    "week13_beta",
      referrer_url:    "https://youtube.com/watch?v=abc",
    });
  });
});

// ── T-UTM-005: end-to-end signup attribution flow ──────────────────────────
describe("T-UTM-005: full attribution flow", () => {
  it("landing page → signup page → profile fields", () => {
    // 1. User lands on homepage with PH UTM
    fakeWindow.location.search   = "?utm_source=product_hunt&utm_medium=referral&utm_campaign=day1";
    fakeWindow.location.pathname = "/";
    captureUtm(); // UtmCapture component fires on layout mount

    // 2. User navigates to signup (no UTM in URL)
    fakeWindow.location.search   = "";
    fakeWindow.location.pathname = "/signup";
    captureUtm(); // Called again — should NOT overwrite

    // 3. User submits signup → read UTM and build profile update
    const stored = getStoredUtm();
    const fields = utmToProfileFields(stored);

    assert.equal(fields.referral_source, "product_hunt");
    assert.equal(fields.utm_medium,      "referral");
    assert.equal(fields.utm_campaign,    "day1");

    // 4. After DB write, clear storage
    clearStoredUtm();
    assert.deepEqual(getStoredUtm(), {});
  });

  it("creator link → signup preserves creator UTM code", () => {
    fakeWindow.location.search = "?utm_source=creator_sharma&utm_medium=youtube&utm_campaign=video_jee_mech";
    captureUtm();

    const fields = utmToProfileFields(getStoredUtm());
    assert.equal(fields.referral_source, "creator_sharma");
    assert.ok(fields.referral_source.startsWith("creator_"));
  });

  it("direct signup URL with UTM still captured", () => {
    fakeWindow.location.search   = "?utm_source=email_launch";
    fakeWindow.location.pathname = "/signup";
    captureUtm();
    assert.equal(getStoredUtm().utm_source, "email_launch");
  });
});
