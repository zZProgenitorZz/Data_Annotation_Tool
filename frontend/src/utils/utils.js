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

function extractUserId(entry) {
  if (!entry) return "";
  // "68d68d8d3e5efa38e46d7a1f - annotator" -> "68d68d8d3e5efa38e46d7a1f"
  return String(entry).split(" - ")[0].trim();
};

function extractUserRole(entry){
  if (!entry) return "";
  return String(entry).split(" - ")[1].trim();
};

// "68d6...a1f - annotator" → { "68d6...a1f": "annotator" }
const parseAssignedTo = (assignedList) => {
  if (!Array.isArray(assignedList)) return {};

  const map = {};

  assignedList.forEach(entry => {
    if (!entry) return;
    const [idPart, rolePart] = String(entry).split(" - ");
    const userId = idPart?.trim();
    const role = rolePart?.trim();
    if (userId) {
      map[userId] = role || null;
    }
  });

  return map;
};

 function buildAssignedTo(userIds, userRoles) {
  const result = [];

  userIds.forEach((id) => {
    const role = userRoles[id];
    if (role) {
      result.push(`${id} - ${role}`);
    }
  });

  return result;
}
 // Helper: parse datasetToEdit.assignedTo (["id - role", ...])
  const parseAssignedFromDataset = (raw) => {
    const list = Array.isArray(raw)
      ? raw
      : raw
      ? String(raw).split(",")
      : [];

    const ids = [];
    const rolesMap = {};

    list.forEach((entry) => {
      const [idPart, rolePart] = String(entry)
        .split(" - ")
        .map((s) => s.trim());

      if (idPart) {
        ids.push(idPart);
        if (rolePart) {
          rolesMap[idPart] = rolePart;
        }
      }
    });

    return { ids, rolesMap };
  };



export {getChangedFields,  extractUserId, parseAssignedTo, extractUserRole, buildAssignedTo, parseAssignedFromDataset}




