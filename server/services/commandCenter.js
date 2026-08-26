function total(groups) {
  return groups.reduce((sum, row) => sum + row._count._all, 0);
}
export function buildCommandCenter(snapshot) {
  const tasks = total(snapshot.taskStatus);
  const blocked = snapshot.taskStatus
    .filter((row) => ["AT_RISK", "BLOCKED"].includes(row.status))
    .reduce((sum, row) => sum + row._count._all, 0);
  const volunteers = total(snapshot.volunteerStatus);
  const trained =
    snapshot.volunteerStatus.find((row) => row.trainingStatus === "COMPLETED")?._count._all || 0;
  const healthScore = Math.max(
    0,
    Math.round(
      100 - (tasks ? blocked / tasks : 0) * 65 - (snapshot.campaign.status === "ACTIVE" ? 0 : 15),
    ),
  );
  const alerts = [
    ...snapshot.tasksAtRisk.slice(0, 3).map((task) => ({
      severity: task.status === "BLOCKED" ? "critical" : "warning",
      title: task.title,
      detail: `${task.status.replaceAll("_", " ")} · ${task.owner?.displayName || "Owner required"}`,
      owner: task.owner?.displayName || null,
    })),
    ...(snapshot.intelligence.length
      ? []
      : [
          {
            severity: "info",
            title: "No mapped public intelligence for this filter",
            detail: "No approved aggregate evidence is available.",
            owner: null,
          },
        ]),
  ];
  const recommendations = [];
  if (blocked)
    recommendations.push({
      title: "Resolve blocked work",
      rationale: `${blocked} task${blocked === 1 ? " is" : "s are"} at risk or blocked.`,
      owner: snapshot.tasksAtRisk[0]?.owner?.displayName || "Campaign Manager",
    });
  if (volunteers && trained / volunteers < 0.7)
    recommendations.push({
      title: "Prioritize volunteer training",
      rationale: `${trained} of ${volunteers} volunteers have completed training.`,
      owner: "Volunteer Coordinator",
    });
  if (!recommendations.length)
    recommendations.push({
      title: "Maintain execution cadence",
      rationale: "No rule-based critical intervention was identified in approved operational data.",
      owner: "Campaign Manager",
    });
  const topTask = snapshot.tasksAtRisk[0];
  const nextEvent = snapshot.events[0];
  return {
    ...snapshot,
    health: {
      score: healthScore,
      label: healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Watch" : "Needs attention",
      tasks,
      blocked,
    },
    volunteers: { total: volunteers, trained },
    alerts,
    recommendations,
    dailyBrief: {
      generatedAt: new Date().toISOString(),
      headline: blocked
        ? `${blocked} execution item${blocked === 1 ? " requires" : "s require"} attention`
        : "Campaign execution is stable",
      whatChanged: `${snapshot.changedLast24Hours} approved operational change${snapshot.changedLast24Hours === 1 ? "" : "s"} recorded in the last 24 hours.`,
      whatMatters: topTask
        ? `${topTask.title} is ${topTask.status.toLowerCase().replaceAll("_", " ")}.`
        : "No tasks are currently marked at risk or blocked.",
      nextAction: topTask
        ? `${topTask.owner?.displayName || "Campaign Manager"} should review ${topTask.title}.`
        : nextEvent
          ? `Prepare for ${nextEvent.title}.`
          : "Confirm the next campaign milestone.",
      evidence: snapshot.intelligence.length
        ? `${snapshot.intelligence.length} approved aggregate public-intelligence result${snapshot.intelligence.length === 1 ? "" : "s"} support this view.`
        : "This brief currently relies on approved campaign operational data; no matching public aggregate was found.",
    },
    queryPlan: {
      boundedQueries: 13,
      respondentRowsScanned: false,
      aggregateTable: "survey_aggregate_results",
    },
  };
}
