function normalizePhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");\n  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function findDuplicateLead(newLead = {}, existingLeads = []) {
  const newPhone = normalizePhone(newLead.phone);
  const newEmail = normalizeEmail(newLead.email);
  const businessId = String(newLead.businessId || "");

  if (!businessId) {
    return {
      duplicate: false,
      reason: "Business ID is required for duplicate checking"
    };
  }

  const match = existingLeads.find(existing => {
    // Never match across different businesses
    if (String(existing.businessId || "") !== businessId) {
      return false;
    }

    const existingPhone = normalizePhone(existing.phone);
    const existingEmail = normalizeEmail(existing.email);

    const phoneMatch =
      newPhone.length >= 7 &&
      existingPhone.length >= 7 &&
      newPhone === existingPhone;

    const emailMatch =
      newEmail.length > 0 &&
      existingEmail.length > 0 &&
      newEmail === existingEmail;

    return phoneMatch || emailMatch;
  });

  if (!match) {
    return {
      duplicate: false,
      reason: "No matching lead found"
    };
  }

  return {
    duplicate: true,
    matchedLeadId: match.id || null,
    reason: "Matching phone number or email found for this business"
  };
}
