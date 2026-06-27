// Normalise un numéro malgache au format international +261
export function normalizePhone(phone) {
  if (!phone) return null;

  // Retirer espaces, tirets, parenthèses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Cas: commence par +261 déjà
  if (cleaned.startsWith("+261")) {
    return cleaned;
  }

  // Cas: commence par 261 sans +
  if (cleaned.startsWith("261")) {
    return "+" + cleaned;
  }

  // Cas: commence par 0 (format local) → remplacer 0 par +261
  if (cleaned.startsWith("0")) {
    return "+261" + cleaned.substring(1);
  }

  // Cas: numéro sans préfixe (ex: 341234567) → ajouter +261
  if (cleaned.length === 9) {
    return "+261" + cleaned;
  }

  return cleaned;
}

// Valide un numéro malgache
export function isValidMalagasyPhone(phone) {
  const normalized = normalizePhone(phone);
  // +261 suivi de 9 chiffres
  return /^\+261\d{9}$/.test(normalized);
}