import test from "node:test";
import assert from "node:assert/strict";

import {
  validateProfile,
  normalizeProfile,
  onboardingProgress,
  analyzeBusiness,
  generateGrowthPlan,
  auditWebsite
} from "./features.js";

test("28: missing business fields are reported", () => {
  assert.equal(validateProfile({}).valid, false);
});

test("28: complete profile passes validation", () => {
  const p = {
    businessName: "Demo",
    industry: "Retail",
    location: "Pune",
    services: ["Shoes"],
    audience: "Customers"
  };
  assert.equal(validateProfile(p).valid, true);
});

test("28: services are trimmed and duplicates removed", () => {
  assert.deepEqual(
    normalizeProfile({ services: "SEO, Ads, SEO" }).services,
    ["SEO", "Ads"]
  );
});

test("28: onboarding progress calculates correctly", () => {
  const p = {
    businessName: "Demo",
    industry: "Retail",
    location: "Pune",
    services: ["Shoes"],
    audience: "Customers"
  };
  assert.equal(onboardingProgress(p).percentage, 71);
});

test("29: analyzer returns business identity", () => {
  const r = analyzeBusiness({ businessName: "Demo", industry: "Retail" });
  assert.equal(r.businessName, "Demo");
});

test("29: analyzer detects price intent", () => {
  const r = analyzeBusiness({ services: ["pricing and quotes"] });
  assert.ok(r.intentSignals.includes("pricing"));
});

test("29: analyzer includes non-live-data disclaimer", () => {
  assert.match(analyzeBusiness({}).note, /No live market research/);
});

test("29: services generate customer questions", () => {
  const r = analyzeBusiness({ services: ["SEO"] });
  assert.equal(r.questionsToExplore.length, 1);
});

test("30: growth plan has four weeks", () => {
  assert.equal(generateGrowthPlan({}).plan.length, 4);
});

test("30: growth plan includes measurable metrics", () => {
  assert.ok(generateGrowthPlan({}).metrics.length >= 3);
});

test("31: empty SEO checklist score is zero", () => {
  assert.equal(auditWebsite({}).score, 0);
});

test("31: complete SEO checklist scores 100", () => {
  const p = {
    title: "Title",
    metaDescription: "Description",
    h1: "Heading",
    mobileFriendly: true,
    cta: "Contact",
    uniqueContent: true,
    contactInfo: "Email",
    performanceReviewed: true
  };
  assert.equal(auditWebsite(p).score, 100);
});
