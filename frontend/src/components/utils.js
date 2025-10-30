function getChangedFields(original, updated) {
  const diff = {};
  for (const key in updated) {
    // Vergelijk alleen wanneer veld bestaat in original
    if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      diff[key] = updated[key];
    }
  }
  return diff;
}

export default getChangedFields
