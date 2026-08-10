const CORPORATE_SUFFIXES = [
  "public limited company",
  "private limited",
  "public limited",
  "pvt ltd",
  "pvt limited",
  "private ltd",
  "limited",
  "ltd",
  "pvt",
  "llp",
];

const CONTEXT_WORDS = [
  "initial public offering",
  "sme ipo",
  "main board ipo",
  "mainboard ipo",
  "book built issue",
  "book building issue",
  "ipo",
];

const NOISY_PARENTHESES = /\b(ipo|initial public offering|tentative|expected|open now|opens?|closes?|price|dates?|status|mainboard|main board|sme)\b/i;
const TOKEN_EQUIVALENTS: Record<string, string> = {
  "&": "and",
  co: "company",
  corp: "corporation",
  engg: "engineering",
  intl: "international",
};

function removePhrase(value: string, phrase: string) {
  return value.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
}

function stripProviderNoise(rawName: string) {
  let removedNoisyParenthesis = false;
  let value = rawName.replace(/\(([^()]*)\)/g, (match, inner: string) => {
    if (NOISY_PARENTHESES.test(inner)) {
      removedNoisyParenthesis = true;
      return " ";
    }
    return ` ${inner} `;
  });

  value = value
    .replace(/\[[^\]]*\b(?:ipo|tentative|expected|open|closed|listed)\b[^\]]*\]/gi, " ")
    .replace(/\b(?:tentative|expected)\s+(?:dates?|price|issue|listing)\b.*$/gi, " ");

  // A few provider feeds append short internal state codes after an IPO label,
  // for example "(Company IPO) O" or "(Company IPO) CT".
  if (removedNoisyParenthesis) {
    value = value.replace(/\s+[A-Z]{1,3}\s*$/g, " ");
  }

  return value;
}

function canonicalToken(token: string) {
  const equivalent = TOKEN_EQUIVALENTS[token];
  if (equivalent) return equivalent;
  return token;
}

export function normalizeIPONameClean(rawName: string | null | undefined) {
  if (!rawName) return "";

  let name = stripProviderNoise(rawName)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ");
  name = name.replace(/[^a-z0-9\s]/g, " ");

  for (const phrase of [...CONTEXT_WORDS, ...CORPORATE_SUFFIXES].sort((a, b) => b.length - a.length)) {
    name = removePhrase(name, phrase);
  }

  return name
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(canonicalToken)
    .filter(Boolean)
    .join(" ");
}

export function sanitizeIPONameClean(rawName: string) {
  const stripped = stripProviderNoise(rawName)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.)])/g, "$1")
    .trim();

  return stripped || rawName.trim();
}

export function slugifyIPONameClean(rawName: string) {
  return normalizeIPONameClean(rawName).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}
