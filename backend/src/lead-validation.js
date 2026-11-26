export function validateLead(input = {}) {
  const name = String(input.name || "").trim();
  const phone = String(input.phone || "").trim();
  const email = String(input.email || "").trim();
  const message = String(input.message || "").trim();

  const errors = [];

  if (!name) errors.push("Name is required");
  if (name.length > 100) errors.push("Name is too long");

  if (!phone && !email) {
    errors.push("Phone or email is required");
  }

  if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) {
    errors.push("Phone number is invalid");
  }

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push("Email address is invalid");
  }

  if (message.length > 2000) {
    errors.push("Message is too long");
  }

  return {
    valid: errors.length === 0,
    errors,
    cleaned: {
      name,
      phone,
      email: email.toLowerCase(),
      message
    }
  };
}

export function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}
