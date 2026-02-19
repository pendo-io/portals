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

// --- Fake data pools ---
const COMPANIES = [
  "Northwind Systems",
  "Apex Dynamics",
  "Silverline Corp",
  "Meridian Labs",
  "Horizon Digital",
  "Crestview Analytics",
  "BluePeak Software",
  "Ironclad Solutions",
  "Vantage Cloud",
  "Orion Technologies",
  "Summit Partners",
  "Catalyst Group",
  "Pinnacle AI",
  "Redwood Data",
  "Evergreen Platform",
  "Cobalt Industries",
  "Nexus Innovations",
  "Atlas Ventures",
  "Prism Analytics",
  "Sterling Logic",
  "Quantum Reach",
  "Ember Systems",
  "Velocity Labs",
  "Keystone Digital",
  "BrightPath Tech",
  "Forge Dynamics",
  "Elevate Cloud",
  "Spectrum IO",
  "Trident Software",
  "Lumen Works",
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

function domainFromCompany(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
}

export function anonCompany(name: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || name == null) return name;
  return pick(COMPANIES, name);
}

export function anonDomain(domain: string | null | undefined): string | null | undefined {
  if (!DEMO_MODE || domain == null) return domain;
  const company = pick(COMPANIES, domain);
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
  const company = pick(COMPANIES, email + "_company");
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
  const company = pick(COMPANIES, website);
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
  const fakeCompany = pick(COMPANIES, nameKey);
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
    const fakeAcctCompany = pick(COMPANIES, acctKey);
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
    ? pick(COMPANIES, (record.Account?.Name ?? record.Account?.Id ?? "") )
    : pick(COMPANIES, emailDomainKey + "_company");
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
  const fakeCompany = pick(COMPANIES, nameKey + "_opp");

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
  const fakeCompany = pick(COMPANIES, acctKey);
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
