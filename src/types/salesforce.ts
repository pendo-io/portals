export interface SFDCAccount {
  Id: string;
  Name: string;
  Industry: string | null;
  Type: string | null;
  OwnerId: string;
  Owner: { Name: string } | null;
  Website: string | null;
  Description: string | null;
  BillingCity: string | null;
  BillingState: string | null;
  BillingCountry: string | null;
  Phone: string | null;
  NumberOfEmployees: number | null;
  AnnualRevenue: number | null;
  Domain_Name__c: string | null;
  CreatedDate: string;
  LastModifiedDate: string | null;
}

export interface SFDCOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Probability: number | null;
  AccountId: string;
  OwnerId: string;
  Owner: { Name: string } | null;
  CreatedDate: string;
  LastModifiedDate: string | null;
}

export interface SFDCContact {
  Id: string;
  FirstName: string | null;
  LastName: string;
  Name: string;
  Title: string | null;
  Email: string | null;
  Phone: string | null;
  MobilePhone: string | null;
  Department: string | null;
  MailingCity: string | null;
  MailingState: string | null;
  MailingCountry: string | null;
  Description: string | null;
  OwnerId: string | null;
  Owner: { Name: string } | null;
  AccountId: string;
  Account: { Name: string; Id: string; Domain_Name__c?: string | null; Website?: string | null; Industry?: string | null; Type?: string | null; Phone?: string | null } | null;
  CreatedDate: string;
  LastModifiedDate: string | null;
}
