export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// --- Deterministic hash: same input → same index every time ---
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(pool: T[], key: string): T {
  return pool[hash(key) % pool.length];
}

// Unique company assignment: avoids two real companies mapping to the same fake one
const companyMap = new Map<string, string>();
const usedCompanies = new Set<string>();
let openAIAssignedToAccount = false;

function pickCompany(realName: string): string {
  const existing = companyMap.get(realName);
  if (existing) return existing;

  let idx = hash(realName) % COMPANIES.length;
  let company = COMPANIES[idx];

  // If taken, find next available slot
  if (usedCompanies.has(company)) {
    for (let i = 1; i < COMPANIES.length; i++) {
      const candidate = COMPANIES[(idx + i) % COMPANIES.length];
      if (!usedCompanies.has(candidate)) {
        company = candidate;
        break;
      }
    }
  }

  companyMap.set(realName, company);
  usedCompanies.add(company);
  return company;
}

// Ensures first SFDC account record always maps to OpenAI
function pickAccountCompany(realName: string): string {
  if (!openAIAssignedToAccount && !companyMap.has(realName)) {
    openAIAssignedToAccount = true;
    // If OpenAI was already assigned to a different key (e.g. from signals), swap it
    const existingOpenAIKey = [...companyMap.entries()].find(([, v]) => v === "OpenAI")?.[0];
    if (existingOpenAIKey) {
      // Give that key a new company instead
      const idx = hash(existingOpenAIKey) % COMPANIES.length;
      for (let i = 0; i < COMPANIES.length; i++) {
        const candidate = COMPANIES[(idx + i) % COMPANIES.length];
        if (!usedCompanies.has(candidate)) {
          companyMap.set(existingOpenAIKey, candidate);
          usedCompanies.add(candidate);
          break;
        }
      }
    }
    usedCompanies.add("OpenAI");
    companyMap.set(realName, "OpenAI");
    return "OpenAI";
  }
  return pickCompany(realName);
}

// --- Data pools ---
const COMPANIES = [
  "OpenAI",
  "Nike",
  "Apple",
  "Spotify",
  "Airbnb",
  "Netflix",
  "Shopify",
  "Uber",
  "Zoom",
  "Adobe",
  "Lululemon",
  "Starbucks",
  "Disney",
  "Target",
  "Peloton",
  "Stripe",
  "Squarespace",
  "Etsy",
  "Lyft",
  "DoorDash",
  "Rivian",
  "Hulu",
  "Pinterest",
  "Snap",
  "Reddit",
  "Roku",
  "Wayfair",
  "Zillow",
  "Dropbox",
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey",
  "Riley", "Quinn", "Avery", "Blake", "Drew",
  "Jamie", "Sage", "Harper", "Reese", "Cameron",
  "Parker", "Skyler", "Finley", "Rowan", "Emery",
  "Dakota", "Hayden", "River", "Phoenix", "Kendall",
  "Marley", "Remy", "Ellis", "Tatum", "Lennox",
];

const LAST_NAMES = [
  "Anderson", "Bennett", "Carter", "Dawson", "Ellis",
  "Foster", "Graham", "Hayes", "Ingram", "Jensen",
  "Klein", "Lawson", "Mitchell", "Nolan", "Owens",
  "Palmer", "Quinn", "Reeves", "Shaw", "Turner",
  "Underwood", "Vance", "Walsh", "Young", "Zimmer",
  "Banks", "Crane", "Drake", "Fleming", "Grant",
];

const INDUSTRIES = [
  "Technology", "Financial Services", "Healthcare", "Retail",
  "Manufacturing", "Education", "Energy", "Media",
  "Telecommunications", "Transportation",
];

const CITIES_STATES = [
  ["Austin", "TX"], ["Denver", "CO"], ["Seattle", "WA"],
  ["Portland", "OR"], ["Chicago", "IL"], ["Boston", "MA"],
  ["Nashville", "TN"], ["Raleigh", "NC"], ["Phoenix", "AZ"],
  ["Minneapolis", "MN"], ["Atlanta", "GA"], ["Miami", "FL"],
  ["San Diego", "CA"], ["Salt Lake City", "UT"], ["Detroit", "MI"],
];

// --- Low-level anonymizers ---

const COMPANY_DOMAINS: Record<string, string> = {
  "OpenAI": "openai.com",
  "Nike": "nike.com",
  "Apple": "apple.com",
  "Spotify": "spotify.com",
  "Airbnb": "airbnb.com",
  "Netflix": "netflix.com",
  "Shopify": "shopify.com",
  "Uber": "uber.com",
  "Zoom": "zoom.us",
  "Adobe": "adobe.com",
  "Lululemon": "lululemon.com",
  "Starbucks": "starbucks.com",
  "Disney": "disney.com",
  "Target": "target.com",
  "Peloton": "onepeloton.com",
  "Stripe": "stripe.com",
  "Squarespace": "squarespace.com",
  "Etsy": "etsy.com",
  "Lyft": "lyft.com",
  "DoorDash": "doordash.com",
  "Rivian": "rivian.com",
  "Hulu": "hulu.com",
  "Pinterest": "pinterest.com",
  "Snap": "snap.com",
  "Reddit": "reddit.com",
  "Roku": "roku.com",
  "Wayfair": "wayfair.com",
  "Zillow": "zillow.com",
  "Dropbox": "dropbox.com",
};

function domainFromCompany(company: string): string {
  return COMPANY_DOMAINS[company] ?? company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

export function anonCompany(name: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || name == null) return name;
  return pickCompany(name);
}

export function anonDomain(domain: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || domain == null) return domain;
  const company = pickCompany(domain);
  return domainFromCompany(company);
}

export function anonPerson(name: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || name == null) return name;
  const first = pick(FIRST_NAMES, name + "_first");
  const last = pick(LAST_NAMES, name + "_last");
  return `${first} ${last}`;
}

function anonFirstName(name: string | null | undefined, fullNameKey?: string): string | null | undefined {
  if (!DEMO_MODE || name == null) return name;
  const key = fullNameKey ?? name;
  return pick(FIRST_NAMES, key + "_first");
}

function anonLastName(name: string | null | undefined, fullNameKey?: string): string | null | undefined {
  if (!DEMO_MODE || name == null) return name;
  const key = fullNameKey ?? name;
  return pick(LAST_NAMES, key + "_last");
}

export function anonEmail(email: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || email == null) return email;
  const first = pick(FIRST_NAMES, email + "_first").toLowerCase();
  const last = pick(LAST_NAMES, email + "_last").toLowerCase();
  const company = pickCompany(email + "_company");
  return `${first}.${last}@${domainFromCompany(company)}`;
}

export function anonPhone(phone: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || phone == null) return phone;
  const h = hash(phone);
  const d1 = ((h >> 0) & 0x7) + 2;  // 2-9
  const d2 = ((h >> 3) & 0x7) + 2;
  const d3 = ((h >> 6) & 0x7) + 2;
  const d4 = ((h >> 9) & 0x7) + 2;
  const d5 = ((h >> 12) & 0x7) + 2;
  const d6 = ((h >> 15) & 0x7) + 2;
  const d7 = ((h >> 18) & 0x7) + 2;
  return `(555) ${d1}${d2}${d3}-${d4}${d5}${d6}${d7}`;
}

function anonWebsite(website: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || website == null) return website;
  const company = pickCompany(website);
  return `https://www.${domainFromCompany(company)}`;
}

function anonCityState(city: string | null | undefined, state: string | null | undefined, key: string): { city: string | null | undefined; state: string | null | undefined } {
  if (!DEMO_MODE || (city == null && state == null)) return { city, state };
  const [fakeCity, fakeState] = pick(CITIES_STATES, key);
  return {
    city: city != null ? fakeCity : city,
    state: state != null ? fakeState : state,
  };
}

// --- High-level record anonymizers ---

export function anonymizeAccount(record: any): any {
  if (!DEMO_MODE || !record) return record;

  const nameKey = record.Name ?? record.Id ?? "";
  const fakeCompany = pickAccountCompany(nameKey);
  const fakeDomain = domainFromCompany(fakeCompany);
  const { city: bCity, state: bState } = anonCityState(
    record.BillingCity, record.BillingState, nameKey + "_geo"
  );

  return {
    ...record,
    Name: fakeCompany,
    Domain_Name__c: record.Domain_Name__c != null ? fakeDomain : record.Domain_Name__c,
    Website: record.Website != null ? `https://www.${fakeDomain}` : record.Website,
    Phone: anonPhone(record.Phone),
    Industry: record.Industry != null ? pick(INDUSTRIES, nameKey + "_ind") : record.Industry,
    BillingCity: bCity,
    BillingState: bState,
    BillingCountry: record.BillingCountry,
    Owner: record.Owner
      ? { ...record.Owner, Name: anonPerson(record.Owner.Name) }
      : record.Owner,
  };
}

export function anonymizeContact(record: any): any {
  if (!DEMO_MODE || !record) return record;

  const nameKey = record.Name ?? `${record.FirstName} ${record.LastName}` ?? record.Id ?? "";
  const fakeFirst = pick(FIRST_NAMES, nameKey + "_first");
  const fakeLast = pick(LAST_NAMES, nameKey + "_last");
  const fakeFull = `${fakeFirst} ${fakeLast}`;

  // Build anonymized account sub-object if present
  let account = record.Account;
  if (account) {
    const acctKey = account.Name ?? account.Id ?? "";
    const fakeAcctCompany = pickCompany(acctKey);
    const fakeAcctDomain = domainFromCompany(fakeAcctCompany);
    account = {
      ...account,
      Name: fakeAcctCompany,
      Domain_Name__c: account.Domain_Name__c != null ? fakeAcctDomain : account.Domain_Name__c,
      Website: account.Website != null ? `https://www.${fakeAcctDomain}` : account.Website,
      Industry: account.Industry != null ? pick(INDUSTRIES, acctKey + "_ind") : account.Industry,
      Phone: anonPhone(account.Phone),
    };
  }

  const emailDomainKey = record.Email ?? nameKey;
  const emailCompany = account
    ? pickCompany(record.Account?.Name ?? record.Account?.Id ?? "")
    : pickCompany(emailDomainKey + "_company");
  const emailDomain = domainFromCompany(emailCompany);

  const { city: mCity, state: mState } = anonCityState(
    record.MailingCity, record.MailingState, nameKey + "_geo"
  );

  return {
    ...record,
    FirstName: fakeFirst,
    LastName: fakeLast,
    Name: fakeFull,
    Email: record.Email != null
      ? `${fakeFirst.toLowerCase()}.${fakeLast.toLowerCase()}@${emailDomain}`
      : record.Email,
    Phone: anonPhone(record.Phone),
    MobilePhone: anonPhone(record.MobilePhone),
    MailingCity: mCity,
    MailingState: mState,
    Owner: record.Owner
      ? { ...record.Owner, Name: anonPerson(record.Owner.Name) }
      : record.Owner,
    Account: account,
  };
}

export function anonymizeOpportunity(record: any): any {
  if (!DEMO_MODE || !record) return record;

  const nameKey = record.Name ?? record.Id ?? "";
  const fakeCompany = pickCompany(nameKey + "_opp");

  return {
    ...record,
    Name: `${fakeCompany} - ${record.StageName ?? "Opportunity"}`,
    Owner: record.Owner
      ? { ...record.Owner, Name: anonPerson(record.Owner.Name) }
      : record.Owner,
  };
}

export function anonymizeSignal(signal: {
  accountName: string;
  accountDomain: string | null;
  accountOwner: string;
  accountOwnerEmail: string;
  contactName: string | null;
  title: string;
  signalType: string;
  metaData: Record<string, any> | null;
  [key: string]: any;
}): typeof signal {
  if (!DEMO_MODE) return signal;

  const acctKey = signal.accountName;
  const fakeCompany = pickCompany(acctKey);
  const fakeDomain = domainFromCompany(fakeCompany);

  let title = signal.title;
  // If the title contains the real account name, replace it
  if (title.includes(signal.accountName)) {
    title = title.replace(signal.accountName, fakeCompany);
  }
  // If the title is a person name (for contact engagement signals), anonymize it
  if (signal.contactName && title === signal.contactName) {
    title = anonPerson(title) as string;
  }

  let metaData = signal.metaData;
  if (metaData) {
    metaData = { ...metaData };
    if (metaData.full_name) metaData.full_name = anonPerson(metaData.full_name);
    if (metaData.personName) metaData.personName = anonPerson(metaData.personName);
  }

  return {
    ...signal,
    accountName: fakeCompany,
    accountDomain: signal.accountDomain != null ? fakeDomain : null,
    accountOwner: anonPerson(signal.accountOwner) as string,
    accountOwnerEmail: anonEmail(signal.accountOwnerEmail) as string,
    contactName: anonPerson(signal.contactName) as string | null,
    title,
    metaData,
  };
}
