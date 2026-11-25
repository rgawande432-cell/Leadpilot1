
const CHANNELS = ["facebook", "instagram", "linkedin", "google_business"];

const FREQUENCY = {
  facebook: 3,
  instagram: 4,
  linkedin: 2,
  google_business: 2
};

function recommendChannels(profile = {}) {
  const businessType = String(profile.businessType || "").toLowerCase();
  const channels = new Set(["facebook", "instagram"]);

  if (
    businessType.includes("b2b") ||
    businessType.includes("consult") ||
    businessType.includes("software") ||
    businessType.includes("agency")
  ) {
    channels.add("linkedin");
  }

  if (
    profile.location ||
    businessType.includes("retail") ||
    businessType.includes("restaurant") ||
    businessType.includes("shop")
  ) {
    channels.add("google_business");
  }

  return [...channels];
}

function createWeeklyPlan(profile = {}, contentIdeas = []) {
  const channels = recommendChannels(profile);
  const plan = [];
  const days = [
    "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday"
  ];

  let ideaIndex = 0;

  for (const channel of channels) {
    const posts = FREQUENCY[channel] || 2;

    for (let i = 0; i < posts; i++) {
      const idea = contentIdeas.length
        ? contentIdeas[ideaIndex % contentIdeas.length]
        : "Create helpful content for your target customers";

      plan.push({
        day: days[(i * 2 + channels.indexOf(channel)) % 7],
        channel,
        contentIdea: idea,
        status: "draft"
      });

      ideaIndex++;
    }
  }

  return plan;
}

function markReady(item) {
  if (!item || !item.contentIdea) {
    throw new Error("Content idea is required");
  }

  return { ...item, status: "ready" };
}

function detectDuplicates(plan = []) {
  const seen = new Set();

  return plan.map(item => {
    const key = String(item.contentIdea || "")
      .trim()
      .toLowerCase();

    const duplicate = key && seen.has(key);

    if (key) seen.add(key);

    return {
      ...item,
      duplicate: Boolean(duplicate)
    };
  });
}

function getDistributionSummary(plan = []) {
  const summary = {
    total: plan.length,
    draft: 0,
    ready: 0,
    scheduled: 0,
    published: 0,
    channels: {}
  };

  for (const item of plan) {
    if (summary[item.status] !== undefined) {
      summary[item.status]++;
    }

    summary.channels[item.channel] =
      (summary.channels[item.channel] || 0) + 1;
  }

  return summary;
}

module.exports = {
  CHANNELS,
  recommendChannels,
  createWeeklyPlan,
  markReady,
  detectDuplicates,
  getDistributionSummary
};
