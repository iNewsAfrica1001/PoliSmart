export const AFROBAROMETER_MINIMUM_SAMPLE_SIZE = 100;
export const AFROBAROMETER_INTELLIGENCE_CATEGORIES = Object.freeze([
  "PUBLIC_PRIORITIES",
  "ECONOMIC_CONDITIONS",
  "GOVERNMENT_PERFORMANCE",
  "INSTITUTIONAL_TRUST",
  "DEMOCRACY",
  "GOVERNANCE",
  "CORRUPTION",
  "PUBLIC_SERVICES",
  "SECURITY",
  "CIVIC_PARTICIPATION",
  "ELECTIONS",
  "YOUTH",
]);
// Source: Afrobarometer, Merged Round 9 codebook (39 countries), 25 June 2024.
// https://www.afrobarometer.org/wp-content/uploads/2024/10/AB_R9.MergeCodebook_25Jun24.final_.pdf
// Add mappings only from this or a later reviewed authoritative codebook. Never infer meaning from values.
const MOST_IMPORTANT_PROBLEM_RESPONSES = Object.freeze({
  0: "Nothing/no problems",
  1: "Management of the economy",
  2: "Wages, incomes, and salaries",
  3: "Unemployment",
  4: "Poverty/Destitution",
  5: "Rates and taxes",
  6: "Loans/Credit",
  7: "Farming/Agriculture",
  8: "Food shortage/Famine",
  9: "Drought",
  10: "Land",
  11: "Transportation",
  12: "Communications",
  13: "Infrastructure/Roads",
  14: "Education",
  15: "Housing",
  16: "Electricity",
  17: "Water supply",
  18: "Orphans/Street children/Homeless children",
  19: "Services (other)",
  20: "Health",
  21: "AIDS",
  22: "Sickness/Disease",
  23: "Crime and security",
  24: "Corruption",
  25: "Political violence",
  26: "Political instability/Political divisions/Ethnic tensions",
  27: "Discrimination/Inequality",
  28: "Gender issues/Women's rights",
  29: "Democracy/Political rights",
  30: "War (international)",
  31: "Civil war",
  32: "Agricultural marketing",
  33: "Climate change",
  34: "COVID-19",
  180: "Internally displaced",
  1500: "Pollution",
  1680: "Drug abuse",
});

export const AFROBAROMETER_COUNTRY_MAPPINGS = Object.freeze({
  2: "Angola",
  3: "Benin",
  4: "Botswana",
  5: "Burkina Faso",
  6: "Cabo Verde",
  7: "Cameroon",
  8: "Congo-Brazzaville",
  9: "Côte d'Ivoire",
  10: "Eswatini",
  11: "Ethiopia",
  12: "Gabon",
  13: "The Gambia",
  14: "Ghana",
  15: "Guinea",
  16: "Kenya",
  17: "Lesotho",
  18: "Liberia",
  19: "Madagascar",
  20: "Malawi",
  21: "Mali",
  22: "Mauritania",
  23: "Mauritius",
  24: "Morocco",
  25: "Mozambique",
  26: "Namibia",
  27: "Niger",
  28: "Nigeria",
  29: "São Tomé and Príncipe",
  30: "Senegal",
  31: "Seychelles",
  32: "Sierra Leone",
  33: "South Africa",
  34: "Sudan",
  35: "Tanzania",
  36: "Togo",
  37: "Tunisia",
  38: "Uganda",
  39: "Zambia",
  40: "Zimbabwe",
});

const COUNTRY_ALIASES = Object.freeze({
  "Congo-Brazzaville": Object.freeze([
    "Congo Brazzaville",
    "Republic of the Congo",
  ]),
  "Côte d'Ivoire": Object.freeze(["Cote d'Ivoire", "Ivory Coast"]),
});

// Country intent is resolved independently of available aggregate rows so that an unavailable
// named country cannot silently broaden to another country's evidence. The DRC entry is retained
// even though it is not in the approved Round 9 import: an explicit request must fail closed.
export const AFROBAROMETER_COUNTRY_REGISTRY = Object.freeze([
  ...Object.values(AFROBAROMETER_COUNTRY_MAPPINGS).map((canonicalName) =>
    Object.freeze({
      canonicalName,
      aliases: Object.freeze([canonicalName, ...(COUNTRY_ALIASES[canonicalName] || [])]),
    }),
  ),
  Object.freeze({
    canonicalName: "Democratic Republic of the Congo",
    aliases: Object.freeze([
      "Democratic Republic of the Congo",
      "DR Congo",
      "Congo-Kinshasa",
      "DRC",
    ]),
  }),
]);

export const AFROBAROMETER_INDICATOR_MAPPINGS = Object.freeze([
  Object.freeze({
    questionCode: "Q45PT1",
    questionText:
      "In your opinion, what are the most important problems facing this country that government should address?",
    indicatorCode: "PUBLIC_PRIORITY_FIRST_RESPONSE",
    indicatorName: "Most important public problem - first response",
    category: "PUBLIC_PRIORITIES",
    responseMapping: MOST_IMPORTANT_PROBLEM_RESPONSES,
  }),
  Object.freeze({
    questionCode: "Q4A",
    questionText:
      "In general, how would you describe the present economic condition of this country?",
    indicatorCode: "PRESENT_COUNTRY_ECONOMIC_CONDITION",
    indicatorName: "Present country economic condition",
    category: "ECONOMIC_CONDITIONS",
    responseMapping: Object.freeze({
      1: "Very bad",
      2: "Fairly bad",
      3: "Neither good nor bad",
      4: "Fairly good",
      5: "Very good",
    }),
  }),
  Object.freeze({
    questionCode: "Q46A",
    questionText: "How well or badly is the current government handling managing the economy?",
    indicatorCode: "GOVERNMENT_HANDLING_ECONOMY",
    indicatorName: "Government performance managing the economy",
    category: "GOVERNMENT_PERFORMANCE",
    responseMapping: Object.freeze({
      1: "Very badly",
      2: "Fairly badly",
      3: "Fairly well",
      4: "Very well",
    }),
  }),
  Object.freeze({
    questionCode: "Q37A",
    questionText: "How much do you trust the president?",
    indicatorCode: "TRUST_PRESIDENT",
    indicatorName: "Trust in the president",
    category: "INSTITUTIONAL_TRUST",
    responseMapping: Object.freeze({
      0: "Not at all",
      1: "Just a little",
      2: "Somewhat",
      3: "A lot",
    }),
  }),
  Object.freeze({
    questionCode: "Q23",
    questionText:
      "Which statement is closest to your opinion about democracy as a form of government?",
    indicatorCode: "SUPPORT_FOR_DEMOCRACY",
    indicatorName: "Support for democracy",
    category: "DEMOCRACY",
    responseMapping: Object.freeze({
      1: "Does not matter what kind of government",
      2: "Sometimes non-democratic government preferable",
      3: "Democracy preferable",
    }),
  }),
  Object.freeze({
    questionCode: "Q12A",
    questionText: "How well do elections ensure representatives reflect the views of voters?",
    indicatorCode: "ELECTIONS_REFLECT_VOTER_VIEWS",
    indicatorName: "Elections reflect voter views",
    category: "ELECTIONS",
    responseMapping: Object.freeze({
      0: "Not at all well",
      1: "Not very well",
      2: "Fairly well",
      3: "Very well",
    }),
  }),
  Object.freeze({
    questionCode: "Q39A",
    questionText:
      "Over the past year, has the level of corruption in this country increased, decreased, or stayed the same?",
    indicatorCode: "CHANGE_IN_CORRUPTION_LEVEL",
    indicatorName: "Perceived change in corruption",
    category: "CORRUPTION",
    responseMapping: Object.freeze({
      1: "Increased a lot",
      2: "Increased somewhat",
      3: "Stayed the same",
      4: "Decreased somewhat",
      5: "Decreased a lot",
    }),
  }),
  Object.freeze({
    questionCode: "Q40B",
    questionText:
      "How easy or difficult was it to obtain services from teachers or school officials?",
    indicatorCode: "ACCESS_PUBLIC_SCHOOL_SERVICES",
    indicatorName: "Ease of obtaining public school services",
    category: "PUBLIC_SERVICES",
    responseMapping: Object.freeze({
      1: "Very easy",
      2: "Easy",
      3: "Difficult",
      4: "Very difficult",
    }),
  }),
  Object.freeze({
    questionCode: "Q31",
    questionText: "Overall, how satisfied are you with the way democracy works in this country?",
    indicatorCode: "SATISFACTION_WITH_DEMOCRACY",
    indicatorName: "Satisfaction with democratic governance",
    category: "GOVERNANCE",
    responseMapping: Object.freeze({
      0: "Country is not a democracy",
      1: "Not at all satisfied",
      2: "Not very satisfied",
      3: "Fairly satisfied",
      4: "Very satisfied",
    }),
  }),
  Object.freeze({
    questionCode: "Q1",
    questionText: "How old are you?",
    indicatorCode: "YOUTH_AGE_DISTRIBUTION_18_35",
    indicatorName: "Age distribution among respondents aged 18-35",
    category: "YOUTH",
    responseMapping: Object.freeze(
      Object.fromEntries(
        Array.from({ length: 18 }, (_, index) => {
          const age = index + 18;
          return [age, `Age ${age}`];
        }),
      ),
    ),
  }),
  Object.freeze({
    questionCode: "Q7B",
    questionText:
      "Over the past year, how often, if ever, have you or anyone in your family feared crime in your own home?",
    indicatorCode: "FEARED_CRIME_IN_HOME",
    indicatorName: "Frequency of fearing crime in the home",
    category: "SECURITY",
    responseMapping: Object.freeze({
      0: "Never",
      1: "Just once or twice",
      2: "Several times",
      3: "Many times",
      4: "Always",
    }),
  }),
  Object.freeze({
    questionCode: "Q10A",
    questionText:
      "Here is a list of actions that people sometimes take as citizens. For each of these, please tell me whether you, personally, have done any of these things during the past year: attended a community meeting? If yes, was this often, several times or once or twice? If no, would you do this if you had the chance?",
    indicatorCode: "ATTENDED_COMMUNITY_MEETING",
    indicatorName: "Participation in community meetings",
    category: "CIVIC_PARTICIPATION",
    responseMapping: Object.freeze({
      0: "No: Would never do this",
      1: "No: Would if had the chance",
      2: "Yes: Once or twice",
      3: "Yes: Several times",
      4: "Yes: Often",
    }),
  }),
]);
export const AFROBAROMETER_MAPPING_VERSION = "r9-merged-codebook-2024-06-25-v3";
