const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;

const safetyTerms = [
  /password/i,
  /ssn|social security/i,
  /bank account/i,
  /medical record/i,
  /passport/i,
  /private address/i,
  /license plate/i,
  /driver record/i,
  /ethnicity|religion|tribe/i,
  /suppress|intimidate|fake news|rumor/i,
];

export function moderateInput(text) {
  const matches = safetyTerms
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
  return {
    blocked: matches.length > 1,
    risk: matches.length ? "high" : "low",
    labels: matches.length ? ["learner-data-risk"] : ["learning-safe"],
    message: matches.length
      ? "Remove passwords, financial details, identity numbers, or other private information before asking the learning coach."
      : "Safe for a learning response.",
  };
}

async function callOpenAI({ system, user, feature }) {
  if (!apiKey || apiKey.startsWith("replace-with")) return null;

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const error = new Error(`AI provider error for ${feature}.`);
    error.status = 502;
    throw error;
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

function localTutorHint({ prompt, context, locale = "en" }) {
  const lower = prompt.toLowerCase();
  const subject = /phish|scam|password|privacy|safe/.test(lower)
    ? "online safety"
    : /file|folder|computer|device|keyboard|mouse/.test(lower)
      ? "digital foundations"
      : /email|document|spreadsheet|presentation|work/.test(lower)
        ? "workplace tools"
        : /ai|prompt|verify|hallucinat/.test(lower)
          ? "AI literacy"
          : "digital skills";

  return {
    provider: apiKey ? "openai-ready-local-fallback" : "local-fallback",
    model: apiKey ? DEFAULT_MODEL : "rule-based",
    subject,
    answer: `For ${subject}, start with one small task and describe what you can already do. ${context ? `Context: ${context}. ` : ""}I can explain the next step, give you a safe practice exercise, and help you check your work. Never share passwords or private information.`,
    steps: [
      "Say what you want to accomplish and what appears on your screen.",
      "Try one clear step using fictional or non-sensitive practice information.",
      "Check the result and compare it with the lesson example.",
      "Ask an instructor when a decision affects grades, certificates, money, or personal data.",
    ],
    quiz: [
      {
        question: "What should happen before AI uses supporter or donor data?",
        answer: "Confirm consent, authorize access, redact sensitive data, and log usage.",
      },
      {
        question: "What makes a campaign AI recommendation safer?",
        answer: "Source grounding, confidence, legal review, human approval, and auditability.",
      },
    ],
    nextQuestion:
      locale === "fr"
        ? "Quelle compétence numérique voulez-vous pratiquer ensuite ?"
        : "Which digital skill would you like to practice next?",
  };
}

export async function getTutoringHint(input) {
  const prompt = input.prompt || "";
  const moderation = moderateInput(`${prompt} ${input.context || ""}`);
  if (moderation.blocked) {
    return {
      provider: "safety-guardrail",
      model: "moderation",
      subject: "Learning safety",
      answer: moderation.message,
      steps: [
        "Remove sensitive or manipulative details",
        "Use aggregate or fictional practice data",
        "Ask the copilot again",
      ],
      quiz: [],
      nextQuestion:
        "Can you rewrite the campaign request without sensitive or manipulative details?",
      moderation,
    };
  }

  const system = [
    "You are Nova, pTech's patient digital-literacy learning coach for adult learners and beginners.",
    "Teach with plain language, short steps, encouragement, realistic practice, and respectful corrections.",
    "Ground answers in approved course context and preserve instructor authority over grading, certificates, disputes, payments, and learner support decisions.",
    "Protect personal information. Never request passwords, identity numbers, financial details, private records, or real sensitive data for practice.",
    "Return concise JSON with answer, steps array, quiz array, nextQuestion, and subject.",
  ].join(" ");
  const user = `Locale: ${input.locale || "en"}\nCourse context: ${input.context || "General digital literacy"}\nLearner question: ${prompt}`;

  const aiText = await callOpenAI({ system, user, feature: "digital-literacy-tutor" });
  if (aiText) {
    try {
      return { provider: "openai", model: DEFAULT_MODEL, moderation, ...JSON.parse(aiText) };
    } catch {
      return {
        provider: "openai",
        model: DEFAULT_MODEL,
        moderation,
        answer: aiText,
        steps: [],
        quiz: [],
        nextQuestion: "What campaign workflow should we review next?",
      };
    }
  }
  return { ...localTutorHint(input), moderation };
}

export function explainScam({ simulation, selectedFlags = [] }) {
  const expected = simulation.redFlags || [];
  const hits = selectedFlags.filter((flag) => expected.includes(flag));
  const missed = expected.filter((flag) => !selectedFlags.includes(flag));
  const score = Math.round((hits.length / Math.max(expected.length, 1)) * 100);
  return {
    score,
    passed: score >= 70,
    hits,
    missed,
    feedback: missed.length
      ? `Good start. Review these campaign safety signals: ${missed.join(", ")}. Recommended action: ${simulation.safeAction}`
      : `Excellent. You spotted the major warning signs. Recommended action: ${simulation.safeAction}`,
  };
}

export function gradePrompt({ prompt, level = "Beginner" }) {
  const checks = [
    {
      key: "role",
      label: "Names a role or audience",
      pass: /act as|you are|for a|for an|audience|candidate|manager|communications|volunteer|finance|analyst|voter|supporter/i.test(
        prompt,
      ),
    },
    {
      key: "task",
      label: "States the task clearly",
      pass: prompt.trim().split(/\s+/).length >= 10,
    },
    {
      key: "context",
      label: "Provides context or examples",
      pass: /context|example|background|goal|country|policy|event|region|because/i.test(prompt),
    },
    {
      key: "format",
      label: "Requests an output format",
      pass: /list|table|bullet|paragraph|template|json|briefing|email|speech|post/i.test(prompt),
    },
    {
      key: "safety",
      label: "Avoids private data and asks for review",
      pass:
        !moderateInput(prompt).blocked &&
        /check|verify|ask|do not invent|cite|source|approve/i.test(prompt),
    },
  ];
  const score = Math.round((checks.filter((item) => item.pass).length / checks.length) * 100);
  return {
    level,
    score,
    checks,
    improvedPrompt: `Act as an ethical campaign strategist for AfricaCampaignAI. Help with this task: ${prompt.trim()} Include country assumptions, source checks, factual claims needing verification, confidence, audience, required disclaimer, and a human-approval checkpoint. Do not invent facts, suppress voters, target protected attributes, or use unverified personal attacks; ask for missing campaign context.`,
    feedback:
      score >= 80
        ? "Strong campaign prompt. It gives the AI enough direction while keeping source grounding, compliance, and safety in view."
        : "Add a clearer campaign role, country context, output format, confidence requirement, citation requirement, and human review step.",
  };
}

export function generateCareerAsset({ type, name, targetRole, experience }) {
  const cleanName = name || "Requester";
  const role = targetRole || "campaign workflow";
  const background =
    experience || "country, audience, message, compliance, budget, and approval requirements";
  if (type === "manifesto") {
    return {
      title: `Manifesto section for ${role}`,
      executiveSummary: `${cleanName} is preparing a policy platform focused on ${background}.`,
      priorities: [
        "Define measurable goals",
        "Name delivery agencies and partners",
        "Estimate budget assumptions",
        "Publish progress indicators",
      ],
      legislativeAgenda: [
        "Draft enabling bill or regulation",
        "Set oversight and transparency rules",
        "Create quarterly reporting mechanism",
      ],
      reviewChecklist: [
        "Verify country law",
        "Cite data sources",
        "Validate budget realism",
        "Approve with policy and legal leads",
      ],
    };
  }
  if (type === "fundraising") {
    return {
      title: `Fundraising compliance workflow for ${role}`,
      controls: [
        "Verify donor eligibility and country limits",
        "Issue tamper-resistant receipts",
        "Reconcile payment provider batches",
        "Export audit-ready reports",
      ],
      integrations: ["Mobile money", "Bank transfer", "Card payment", "Accounting ledger"],
      reviewChecklist: [
        "Legal approval",
        "Finance officer sign-off",
        "Data retention rule",
        "Expense category mapping",
      ],
    };
  }
  if (type === "cover-letter") {
    return {
      title: `Approval packet for ${role}`,
      content: `Requester: ${cleanName}\nCampaign workflow: ${role}\nContext: ${background}\n\nRecommended approvals:\n1. Campaign manager verifies strategic need.\n2. Communications verifies facts, tone, and citations.\n3. Legal/compliance reviews election-law and privacy risk.\n4. Platform records audit event after approval.`,
    };
  }
  if (type === "interview") {
    return {
      title: `Workflow checklist for ${role}`,
      questions: [
        "Has the accountable campaign owner approved the workflow?",
        "Are facts, citations, language, and country compliance rules documented?",
        "Does the workflow require finance, privacy, media, or legal review?",
        "What audit event and completion notification should be emitted?",
      ],
    };
  }
  return {
    title: `Campaign artifact for ${role}`,
    summary: `${cleanName} requested ${role}. Required context: ${background}.`,
    bullets: [
      "Create an intake record with country, audience, objective, message, channel, owner, and deadline.",
      "Draft with factual claims separated from opinion and mark every claim needing citation.",
      "Route through communications, legal/compliance, finance, or regional lead when required.",
      "Write audit logs, attach disclaimer metadata, and notify the accountable campaign owner.",
    ],
    checklist: [
      "Validate facts",
      "Check country rules",
      "Avoid protected targeting",
      "Log all approvals",
    ],
  };
}

export function answerOperationsCopilot({ question, catalog }) {
  const lower = question.toLowerCase();
  const critical =
    catalog.operationalTickets?.filter((ticket) => ["High", "Critical"].includes(ticket.urgency)) ||
    [];
  const priorityRegions =
    catalog.regionalPerformance?.filter((region) => region.sentiment < 65) ||
    catalog.deviceHealth?.filter((region) => region.sentiment < 65) ||
    [];
  if (/critical|queue|approval|task/.test(lower)) {
    return {
      intent: "campaign-queue",
      answer: `There are ${critical.length} high-priority campaign items requiring attention.`,
      items: critical,
      recommendation:
        "Confirm owner, deadline, source evidence, and human approval before publishing or acting.",
    };
  }
  if (/region|sentiment|priority|map/.test(lower)) {
    return {
      intent: "regional-priority",
      answer: `${priorityRegions.length} regions need issue follow-up or listening events.`,
      items: priorityRegions,
      recommendation:
        "Schedule listening events, publish issue explainers, and keep outreach aggregate and consent-aware.",
    };
  }
  if (/brief|candidate|summarize|strategy/.test(lower)) {
    return {
      intent: "candidate-briefing",
      answer:
        "Engagement is 79%, positive sentiment is 67%, and the largest workstreams are speech fact-checking, fundraising compliance review, and volunteer deployment.",
      items: [
        catalog.analytics?.at(-1),
        ...critical.slice(0, 2),
        ...priorityRegions.slice(0, 2),
      ].filter(Boolean),
      recommendation:
        "Prioritize youth jobs, healthcare listening sessions, and finance controls while preserving factual review and non-manipulative outreach.",
    };
  }
  return {
    intent: "general-campaign",
    answer:
      "I can summarize campaign tasks, draft speeches and manifesto sections, review content risk, identify regional priorities, and recommend explainable strategy from approved sources.",
    items: [],
    recommendation:
      "Ask a specific campaign question and include country, region, audience, channel, date, and approval threshold when available.",
  };
}
