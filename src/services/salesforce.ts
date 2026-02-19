export interface SFDCQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

async function sfdcFetch<T>(
  token: string,
  instanceUrl: string,
  path: string
): Promise<T> {
  const res = await fetch("/api/sfdc-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, instanceUrl, path }),
  });

  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new Event("sfdc-session-expired"));
    throw new Error(`SFDC API error ${res.status}: Unauthorized`);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`SFDC API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}

export async function query<T>(
  token: string,
  instanceUrl: string,
  soql: string
): Promise<SFDCQueryResult<T>> {
  const encoded = encodeURIComponent(soql);
  const firstPage = await sfdcFetch<SFDCQueryResult<T> & { nextRecordsUrl?: string }>(
    token,
    instanceUrl,
    `/services/data/v59.0/query?q=${encoded}`
  );

  const allRecords = [...firstPage.records];
  let nextUrl = firstPage.nextRecordsUrl;

  while (nextUrl) {
    const nextPage = await sfdcFetch<SFDCQueryResult<T> & { nextRecordsUrl?: string }>(
      token,
      instanceUrl,
      nextUrl
    );
    allRecords.push(...nextPage.records);
    nextUrl = nextPage.nextRecordsUrl;
  }

  return {
    totalSize: firstPage.totalSize,
    done: true,
    records: allRecords,
  };
}

export async function fetchAccounts(
  token: string,
  instanceUrl: string,
  ownerId: string
) {
  const soql = `SELECT Id, Name, Industry, Type, OwnerId, Owner.Name, Website, Phone, NumberOfEmployees, AnnualRevenue, Domain_Name__c, BillingCity, BillingState, CreatedDate, LastModifiedDate FROM Account WHERE OwnerId = '${ownerId}' ORDER BY Name ASC`;
  return query<any>(token, instanceUrl, soql);
}

export async function searchAccounts(
  token: string,
  instanceUrl: string,
  searchTerm: string
) {
  const escaped = searchTerm.replace(/'/g, "\\'");
  const soql = `SELECT Id, Name, Industry, Type, OwnerId, Owner.Name, Website, Phone, NumberOfEmployees, AnnualRevenue, Domain_Name__c, BillingCity, BillingState, CreatedDate, LastModifiedDate FROM Account WHERE Name LIKE '%${escaped}%' ORDER BY Name ASC LIMIT 200`;
  return query<any>(token, instanceUrl, soql);
}

export async function fetchAccount(
  token: string,
  instanceUrl: string,
  accountId: string
) {
  const soql = `SELECT Id, Name, Industry, Type, OwnerId, Owner.Name, Website, Description, BillingCity, BillingState, BillingCountry, Phone, NumberOfEmployees, AnnualRevenue, Domain_Name__c, CreatedDate, LastModifiedDate FROM Account WHERE Id = '${accountId}'`;
  const result = await query<any>(token, instanceUrl, soql);
  return result.records[0] || null;
}

export async function fetchOpportunities(
  token: string,
  instanceUrl: string,
  accountId: string
) {
  const soql = `SELECT Id, Name, StageName, Amount, CloseDate, Probability, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Opportunity WHERE AccountId = '${accountId}' ORDER BY CloseDate DESC`;
  return query<any>(token, instanceUrl, soql);
}

export async function fetchOpenOpportunitiesByOwner(
  token: string,
  instanceUrl: string,
  ownerId: string
) {
  const soql = `SELECT Id, Name, StageName, Amount, CloseDate, Probability, AccountId, OwnerId, Owner.Name, CreatedDate, LastModifiedDate FROM Opportunity WHERE OwnerId = '${ownerId}' AND StageName != 'Closed Won' AND StageName != 'Closed Lost' AND CloseDate >= TODAY ORDER BY CloseDate ASC`;
  return query<any>(token, instanceUrl, soql);
}

export async function fetchContact(
  token: string,
  instanceUrl: string,
  contactId: string
) {
  const soql = `SELECT Id, FirstName, LastName, Name, Title, Email, Phone, MobilePhone, Department, MailingCity, MailingState, MailingCountry, Description, OwnerId, Owner.Name, AccountId, Account.Name, Account.Id, Account.Domain_Name__c, Account.Website, Account.Industry, Account.Type, Account.Phone, CreatedDate, LastModifiedDate FROM Contact WHERE Id = '${contactId}'`;
  const result = await query<any>(token, instanceUrl, soql);
  return result.records[0] || null;
}

export async function fetchContacts(
  token: string,
  instanceUrl: string,
  accountId: string
) {
  const soql = `SELECT Id, FirstName, LastName, Name, Title, Email, Phone, Department, CreatedDate FROM Contact WHERE AccountId = '${accountId}' ORDER BY LastName ASC`;
  return query<any>(token, instanceUrl, soql);
}

export async function fetchMyContacts(
  token: string,
  instanceUrl: string,
  ownerId: string
) {
  const soql = `SELECT Id, FirstName, LastName, Name, Title, Email, Phone, Department, AccountId, Account.Name, Account.Id, Account.Domain_Name__c, Account.Website, CreatedDate FROM Contact WHERE Account.OwnerId = '${ownerId}' ORDER BY LastName ASC`;
  return query<any>(token, instanceUrl, soql);
}

export async function searchContacts(
  token: string,
  instanceUrl: string,
  searchTerm: string
) {
  const escaped = searchTerm.replace(/'/g, "\\'");
  const soql = `SELECT Id, FirstName, LastName, Name, Title, Email, Phone, Department, AccountId, Account.Name, Account.Id, Account.Domain_Name__c, Account.Website, CreatedDate FROM Contact WHERE Name LIKE '%${escaped}%' OR Email LIKE '%${escaped}%' ORDER BY LastName ASC LIMIT 200`;
  return query<any>(token, instanceUrl, soql);
}
