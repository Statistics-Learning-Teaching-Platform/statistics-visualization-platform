import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  currentReturnTo,
  loginRedirectUrl,
  resolvePostLoginTarget,
  withBasePath,
  withoutBasePath,
} from "../src/lib/base-path.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("AuthGate preserves the complete protected URL in an encoded next value", () => {
  const location = {
    pathname: "/st-qselector/paper",
    search: "?chapter=probability&mode=preview",
    hash: "#question-7",
  };
  const returnTo = currentReturnTo(location);
  assert.equal(
    returnTo,
    "/st-qselector/paper?chapter=probability&mode=preview#question-7",
  );
  assert.equal(
    loginRedirectUrl(location),
    "/st-qselector/login?next=%2Fst-qselector%2Fpaper%3Fchapter%3Dprobability%26mode%3Dpreview%23question-7",
  );
});

test("basePath normalization accepts router-relative paths without duplicating it", () => {
  assert.equal(withBasePath("/paper?tab=ai"), "/st-qselector/paper?tab=ai");
  assert.equal(withBasePath("/st-qselector/paper?tab=ai"), "/st-qselector/paper?tab=ai");
  assert.equal(withBasePath("/st-qselector?tab=ai#draft"), "/st-qselector?tab=ai#draft");
  assert.equal(
    currentReturnTo({ pathname: "/paper", search: "?tab=ai", hash: "#draft" }),
    "/st-qselector/paper?tab=ai#draft",
  );
  assert.equal(withoutBasePath("/st-qselector/account"), "/account");
  assert.equal(withoutBasePath("/account"), "/account");
});

test("post-login targets retain same-origin query/hash and reject open redirects", () => {
  const origin = "https://next.modern-stat.com";
  assert.equal(
    resolvePostLoginTarget(
      false,
      "?next=%2Fst-qselector%2Fpaper%3Fset%3D2%23q-3",
      origin,
    ),
    "/st-qselector/paper?set=2#q-3",
  );
  assert.equal(
    resolvePostLoginTarget(false, `?next=${encodeURIComponent(`${origin}/st-qselector/paper?x=1#chart`)}`, origin),
    "/st-qselector/paper?x=1#chart",
  );
  for (const next of [
    "https://evil.example/phishing",
    "//evil.example/phishing",
    "javascript:alert(1)",
    "https://next.modern-stat.com.evil.example/",
    `${origin}//evil.example/phishing`,
    `${origin}/folder/..//evil.example/phishing`,
  ]) {
    assert.equal(
      resolvePostLoginTarget(false, `?next=${encodeURIComponent(next)}`, origin),
      "/st-qselector/",
      `rejects off-origin next: ${next}`,
    );
  }
});

test("shared sign-in returns portal users to the exact route outside the Next basePath", () => {
  const origin = "https://next.modern-stat.com";
  for (const target of ["/", "/profile?tab=progress#course", "/python-learning?lesson=02#editor", "/r-learning", "/apps/regression?mode=lab"]) {
    assert.equal(resolvePostLoginTarget(false, `?next=${encodeURIComponent(target)}`, origin), target);
    assert.equal(resolvePostLoginTarget(false, `?next=${encodeURIComponent(origin + target)}`, origin), target);
  }
});

test("mustChangePassword always sends the user to account setup", () => {
  assert.equal(
    resolvePostLoginTarget(true, "?next=%2Fst-qselector%2Fpaper%3Fchapter%3D1%23q", "https://next.modern-stat.com"),
    "/st-qselector/account",
  );
});

test("AuthGate and login page use the shared safe return-target policy", () => {
  const gate = fs.readFileSync(path.join(root, "src/components/AuthGate.tsx"), "utf8");
  const login = fs.readFileSync(path.join(root, "src/app/login/page.tsx"), "utf8");
  assert.match(gate, /loginRedirectUrl\(window\.location\)/);
  assert.match(gate, /withoutBasePath\(pathname\)/);
  assert.match(gate, /routePathname !== "\/account"/);
  assert.match(login, /resolvePostLoginTarget\(/);
  assert.match(login, /window\.location\.search/);
  assert.match(login, /window\.location\.origin/);
});
