const singularRecordLabels = Object.freeze({
  goals: "goal",
  contacts: "contact",
  contributions: "contribution",
  activities: "activity",
  followUps: "follow-up",
});

export function fundraisingFormHeading(section) {
  const label = singularRecordLabels[section];
  if (!label) throw new Error("Unsupported fundraising section");
  return `New ${label}`;
}
