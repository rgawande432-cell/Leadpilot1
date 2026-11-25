
const SUPPORTED_CHANNELS = [
  "facebook",
  "instagram",
  "linkedin",
  "google_business"
];

function validateInput(input = {}) {
  if (!input.topic || !String(input.topic).trim()) {
    throw new Error("Content topic is required");
  }

  if (!input.businessName || !String(input.businessName).trim()) {
    throw new Error("Business name is required");
  }

  return {
    topic: String(input.topic).trim(),
    businessName: String(input.businessName).trim(),
    description: String(input.description || "").trim(),
    audience: String(input.audience || "potential customers").trim(),
    callToAction: String(input.callToAction || "Contact us to learn more").trim()
  };
}

function generateVariations(input = {}) {
  const data = validateInput(input);
  const topic = data.topic;
  const business = data.businessName;
  const audience = data.audience;
  const cta = data.callToAction;

  const base = `${topic}. ${data.description}`.trim();

  return {
    facebook: {
      channel: "facebook",
      title: topic,
      text: `Looking for ways to improve your business?\n\n${base}\n\n${cta}\n\n— ${business}`,
      status: "draft"
    },

    instagram: {
      channel: "instagram",
      title: topic,
      text: `${topic} ✨\n\n${base}\n\n${cta}\n\n#BusinessGrowth #SmallBusiness #${business.replace(/\s+/g, "")}`,
      status: "draft"
    },

    linkedin: {
      channel: "linkedin",
      title: topic,
      text: `${topic}\n\nBusinesses serving ${audience} can benefit from a thoughtful approach.\n\n${base}\n\n${cta}\n\n${business}`,
      status: "draft"
    },

    google_business: {
      channel: "google_business",
      title: topic,
      text: `${business}: ${base}\n\n${cta}`,
      status: "draft"
    }
  };
}

function repurposeContent(input = {}, channels = SUPPORTED_CHANNELS) {
  const variations = generateVariations(input);

  const selected = [...new Set(channels)];

  for (const channel of selected) {
    if (!SUPPORTED_CHANNELS.includes(channel)) {
      throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  return selected.map(channel => variations[channel]);
}

module.exports = {
  SUPPORTED_CHANNELS,
  validateInput,
  generateVariations,
  repurposeContent
};
