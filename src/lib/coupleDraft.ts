export function buildCreateCoupleInput(input: {
  name: string;
  relationshipStartDate: string;
}) {
  return {
    name: input.name.trim(),
    relationshipStartDate: input.relationshipStartDate,
  };
}

export function buildUpdateCouplePatch(input: {
  name?: string;
  relationshipStartDate?: string;
}) {
  const patch: { name?: string; relationship_start_date?: string } = {};

  if (input.name?.trim()) {
    patch.name = input.name.trim();
  }

  if (input.relationshipStartDate) {
    patch.relationship_start_date = input.relationshipStartDate;
  }

  return patch;
}
