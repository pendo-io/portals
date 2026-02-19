import { Briefcase, Lightbulb, Map, FileText, MessageSquare, Mic, FolderKanban } from "lucide-react";
import { Workflow, WorkflowParameter } from "@/types/workflow";

const commonParameters: WorkflowParameter[] = [
  { name: "clientName", label: "Client Name", type: "text", required: true, placeholder: "e.g. HiBob" },
  { name: "clientWebsite", label: "Client Website", type: "url", required: true, placeholder: "e.g. hibob.com" },
  { name: "yourEmail", label: "Your Email", type: "email", required: true, placeholder: "your.email@pendo.io" },
  { name: "yourName", label: "Your Name", type: "text", required: true, placeholder: "Your full name" }
];

export const workflows: Workflow[] = [
  {
    id: "account-research",
    title: "Account Research",
    category: "AI-Powered Research & Strategy Briefs",
    description: "Automated executive briefing system that researches target companies and creates complete account intelligence reports.",
    longDescription: "This system automatically researches a target company and creates a complete executive briefing. It pulls the latest company information, analyzes goals and challenges, identifies key executives, and builds tailored talking points. The process is fully automated: you provide the company name, the system searches public sources like news, LinkedIn, and Crunchbase, analyzes the company's priorities and technology, maps relevant executives, and packages everything into a professional email. The finished report is ready for sales or customer success teams to use in meetings, renewal discussions, or strategic planning.\n\nCategories: Business research, Account intelligence, Sales enablement\n\nHashtags: #Sales #Automation #ExecutiveBrief #BusinessInsights #AccountResearch #GTM #BusinessStrategy",
    roles: ["SDR", "Seller", "SE"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/6110a1ae-c368-465e-9659-293a24206a89",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "" },
    parameters: commonParameters,
    icon: Briefcase,
    stage: "Research"
  },
  {
    id: "value-hypothesis",
    title: "Value Hypothesis",
    category: "AI-Powered Research & Strategy Briefs",
    description: "Automated value hypothesis generator that creates strategic business presentations with verified company insights.",
    longDescription: "This process uses web-based search to automatically gather the latest information about a target company. It researches the company's mission, objectives, and initiatives, then organizes the findings into a clear value hypothesis report. The workflow pulls verified data from public sources, builds a structured Google Slides presentation, updates a tracking sheet, and emails the final slide link. The result is a ready-to-use business hypothesis deck that sales and customer success teams can apply in client conversations.\n\nCategories: Business research, Strategic planning, Sales enablement, Automation, Presentation building\n\nHashtags: #WebResearch #Automation #SalesEnablement #ValueHypothesis #BusinessInsights #CustomerSuccess",
    roles: ["SDR", "Seller", "SE", "CSM"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/3cd8cdc4-3a27-4564-b3dc-2bc5ecc9a164",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "" },
    parameters: commonParameters,
    icon: Lightbulb,
    stage: "Research"
  },
  {
    id: "strategy-map",
    title: "Strategy Map",
    category: "AI-Powered Research & Strategy Briefs",
    description: "Automated strategy map generator that creates comprehensive company strategy documentation and presentations.",
    longDescription: "This process uses web-based research to automatically create a company strategy map. It collects the latest verified information about a target company—its mission, goals, initiatives, outcomes, and value drivers—then organizes it into two outputs: a Google Slides deck and a Google Doc. Both files are automatically generated, shared, and logged in a Google Sheet for tracking. Finally, the system emails the links directly to the requester. The result is a ready-to-use strategy package for sales, customer success, or leadership teams preparing for strategic conversations.\n\nCategories: Business research, Strategy enablement, Sales & CS support, Automation, Presentation building\n\nHashtags: #WebResearch #Automation #StrategyMap #SalesEnablement #CustomerSuccess #BusinessInsights",
    roles: ["SDR", "Seller", "SE", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/cbe09ccb-8d40-4258-b7ef-c29675a53083",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "" },
    parameters: commonParameters,
    icon: Map,
    stage: "Research"
  },
  {
    id: "account-overview-deck",
    title: "Account Overview Deck",
    category: "AI-Powered Research & Strategy Briefs",
    description: "Automated account overview deck that combines company research with Salesforce CRM data for executive presentations.",
    longDescription: "This process creates an automated account overview deck. It combines web-based company research with Salesforce CRM data to build a customized Google Slides presentation. The system pulls in company basics (industry, size, regions, revenue, mission), recent news, strategic objectives, and friction points. It then enriches the deck with live Salesforce fields such as renewal date, health score, ARR, and open opportunities. The final deck is automatically generated, shared, and delivered by email, ready for sales and customer success teams to use in executive meetings and renewal conversations.\n\nCategories: Account intelligence, Sales enablement, Customer success, Automation, CRM integration\n\nHashtags: #AccountOverview #Automation #SalesEnablement #CustomerSuccess #CRM #BusinessInsights",
    roles: ["SDR", "Seller", "SE", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/b4321f72-9763-4ef7-a5ff-1d26dfe38b5d",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "" },
    parameters: commonParameters,
    icon: FileText,
    stage: "Research"
  },
  {
    id: "transcript-value-hypothesis",
    title: "Transcript-Based Value Hypothesis Automation",
    category: "Call/Transcript-Based Intelligence",
    description: "Automated transcript analysis that extracts strategic insights from client conversations and builds value hypothesis reports.",
    longDescription: "This process uses call and Zoom transcripts to automatically gather strategic insights from client conversations. It consolidates the last 90 days of meetings, extracts objectives, initiatives, KPIs, and pain points directly from what was said, and organizes the findings into a clear value hypothesis report. The workflow builds a structured Google Slides presentation, updates a tracking sheet, and emails the final slide link. The result is a transcript-driven business hypothesis deck that sales and customer success teams can use to align directly with the client's own words.\n\nCategories: Transcript intelligence, Business research, Sales enablement, Customer success, Automation\n\nHashtags: #TranscriptIntelligence #Automation #SalesEnablement #ValueHypothesis #CustomerSuccess #MeetingData",
    roles: ["SDR", "Seller", "SE", "CSM"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/dc196a53-067f-458f-a094-83c1a1fe3b49",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceAccountId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "client-relationship-intelligence",
    title: "AI-Powered Client Relationship Intelligence",
    category: "Call/Transcript-Based Intelligence",
    description: "Automated relationship analysis from Momentum transcripts that assesses account health and identifies expansion or churn risks.",
    longDescription: "This process uses meeting transcripts from Momentum to automatically generate a comprehensive client relationship analysis. It consolidates the last 90 days of meetings, extracts stakeholder sentiment, engagement patterns, challenges, opportunities, and risk signals, and organizes them into an executive-ready report. The workflow produces a structured Google Doc, updates a tracking sheet, and emails the final link. The result is a detailed relationship intelligence report that sales, customer success, and leadership teams can use to assess account health, plan expansions, and mitigate churn risk.\n\nCategories: Transcript intelligence, Relationship management, Account research, Sales enablement, Customer success, Automation\n\nHashtags: #TranscriptIntelligence #ClientRelationship #Automation #SalesEnablement #CustomerSuccess #AccountHealth",
    roles: ["SDR", "Seller", "SE", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/c8633cc0-84b0-49dd-a9d8-946e8c4e8d89",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceAccountId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "joint-value-plan",
    title: "Joint Value Plan (JVP)",
    category: "Call/Transcript-Based Intelligence",
    description: "Automated Joint Value Plan generator that creates comprehensive strategic alignment documents with goals, ROI metrics, and engagement roadmaps based on Momentum transcripts.",
    longDescription: "This workflow automatically generates a comprehensive Joint Value Plan by analyzing Momentum call transcripts and Salesforce data. It creates strategic alignment documents covering: Strategic Alignment (executive objectives, key initiatives, success metrics), Key Metrics & ROI (projected revenue impact, efficiency gains, time savings), Operational Readiness (implementation timeline, resource requirements, risk mitigation), Value Hypothesis (business challenges, Pendo solutions, expected outcomes), Strategy Map (goals, initiatives, value drivers), and Engagement Roadmap (quarterly milestones, success checkpoints, escalation paths). The system produces a professional Google Slides presentation and Google Doc, updates tracking sheets, and delivers everything via branded email. Perfect for CSMs, Account Executives, and leadership teams preparing for strategic planning sessions, QBRs, and renewal conversations.\n\nCategories: Transcript intelligence, Strategic planning, Customer success, Value documentation, Automation\n\nHashtags: #JointValuePlan #TranscriptIntelligence #StrategicAlignment #CustomerSuccess #ValueRealization #Automation",
    roles: ["SDR", "Seller", "SE", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/c1f4523d-7807-4ae8-9511-705a5b27bd3b",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceAccountId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }
    ],
    icon: FolderKanban,
    stage: "Research"
  },
  {
    id: "last-meeting-snapshot",
    title: "Last Meeting Snapshot",
    category: "Call/Transcript-Based Intelligence",
    description: "Automated extraction of key insights from the most recent client meeting for quick follow-up and action planning.",
    longDescription: "This process uses the most recent meeting transcript to automatically capture critical insights and action items from your latest client conversation. It extracts key discussion points, decisions made, stakeholder concerns, next steps, and follow-up items directly from what was said. The workflow generates a concise summary report, updates a tracking sheet, and emails the snapshot to relevant team members. The result is a ready-to-use meeting brief that sales, customer success, and leadership teams can reference for immediate follow-up and action planning.\n\nCategories: Transcript intelligence, Meeting intelligence, Sales enablement, Customer success, Automation\n\nHashtags: #TranscriptIntelligence #MeetingSnapshot #Automation #SalesEnablement #CustomerSuccess #ActionItems",
    roles: ["SDR", "Seller", "SE", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/44a7bf1a-dd25-401c-ad7b-8defa9c27706",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceAccountId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "strategic-evaluation-3-whys",
    title: "Strategic Evaluation: 3 Whys Framework",
    category: "Call/Transcript-Based Intelligence",
    description: "Automated strategic evaluation deck generator that uses transcript analysis and the 3 Whys framework to create root cause analysis presentations.",
    longDescription: "This workflow transforms Momentum call transcripts into executive-ready strategic evaluation decks using the '3 Whys' root cause analysis framework. It fetches the last 90 days of meeting transcripts, extracts the top 3 customer problems with AI analysis, performs root cause analysis, and queries the Pendo knowledge base for solution mapping. The system automatically creates a customized Google Slides presentation with problem deep-dives, customer quotes, Pendo solution mapping, competitive positioning, customer proof points, and evaluation plans. The deck is shared publicly, tracked in a spreadsheet, and delivered via branded email. This automates 4-6 hours of manual discovery analysis into a 5-minute process, perfect for Sales Engineers and Account Executives preparing for strategic conversations.\n\nCategories: Transcript intelligence, Strategic planning, Sales enablement, Root cause analysis, Automation\n\nHashtags: #TranscriptIntelligence #3WhysFramework #StrategicEvaluation #SalesEnablement #RootCauseAnalysis #AIAutomation",
    roles: ["SE", "Seller", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/285f22e3-a8ce-4e2b-ad72-23d62c08184e",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceAccountId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "roi-generator",
    title: "ROI Generator",
    category: "Call/Transcript-Based Intelligence",
    description: "Automated ROI presentation builder that analyzes Salesforce meeting notes to create data-driven business cases with projected savings and revenue impact.",
    longDescription: "This tool automatically creates professional ROI presentations by analyzing your Salesforce meeting transcripts with clients. It pulls all meeting transcripts from the last 90 days, identifies business problems discussed, and finds potential ROI opportunities. The AI builds a Google Slides deck using a 4-part framework: Situation (client's current challenges), Insight (root causes discovered), Action (how Pendo solves it), and Result (expected savings/revenue impact with numbers). The presentation includes client's business problems from actual meetings, data-driven insights, Pendo's solution mapped to their needs, and ROI projections with real numbers ($, %, hours saved). The deck is delivered via email with a direct link, meeting sources used, and next steps. This automates 4-6 hours of manual meeting review and deck building into a 3-5 minute process.\n\nCategories: Transcript intelligence, ROI analysis, Sales enablement, Business case development, Automation\n\nHashtags: #ROIGenerator #TranscriptIntelligence #Automation #SalesEnablement #BusinessCase #DataDriven",
    roles: ["SE", "Seller", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/bf9eaf1b-d1c0-4e18-bdeb-8e8eeb041e36",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceAccountId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceAccountId", label: "Salesforce Account ID", type: "text", required: true, placeholder: "e.g. 0014W00002AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "strategic-account-audio-brief",
    title: "Strategic Account Audio Brief",
    category: "AI Audio Research & Briefings",
    description: "Automated account research that creates a personalized 5-minute podcast-style audio brief delivered via email.",
    longDescription: "This workflow automates end-to-end strategic account research and delivers it as an engaging audio podcast brief. The system researches company fundamentals, strategic priorities, tech stack, competitive landscape, and key executives across multiple sources (Google, LinkedIn, Crunchbase). AI agents synthesize all findings into a conversational 5-minute script that's converted to high-quality audio using OpenAI text-to-speech. The final MP3 is uploaded to Google Drive and delivered via a professional branded email with a shareable link. Perfect for GTM teams preparing for strategic meetings, QBRs, or renewal conversations who want to consume account intelligence on-the-go.\n\nCategories: Account intelligence, Audio briefings, Sales enablement, AI research, Automation\n\nHashtags: #AudioBrief #PodcastStyle #AccountResearch #AIAutomation #SalesEnablement #GTM #VoiceIntelligence",
    roles: ["SDR", "Seller", "SE", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/1537fb76-9353-49fd-b394-80c6c0b93f99",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "" },
    parameters: commonParameters,
    icon: Mic,
    stage: "Research"
  },
  {
    id: "strategic-evaluation-3-whys-opp",
    title: "Strategic Evaluation: 3 Whys Framework (Opp Based)",
    category: "Evaluations Assistant AI (opp based)",
    description: "Automated strategic evaluation deck generator that uses transcript analysis and the 3 Whys framework to create root cause analysis presentations.",
    longDescription: "This workflow transforms Momentum call transcripts into executive-ready strategic evaluation decks using the '3 Whys' root cause analysis framework. It fetches the last 90 days of meeting transcripts, extracts the top 3 customer problems with AI analysis, performs root cause analysis, and queries the Pendo knowledge base for solution mapping. The system automatically creates a customized Google Slides presentation with problem deep-dives, customer quotes, Pendo solution mapping, competitive positioning, customer proof points, and evaluation plans. The deck is shared publicly, tracked in a spreadsheet, and delivered via branded email. This automates 4-6 hours of manual discovery analysis into a 5-minute process, perfect for Sales Engineers and Account Executives preparing for strategic conversations.\n\nCategories: Opportunity-based intelligence, Strategic planning, Sales enablement, Root cause analysis, Automation\n\nHashtags: #OpportunityBased #3WhysFramework #StrategicEvaluation #SalesEnablement #RootCauseAnalysis #AIAutomation",
    roles: ["SE", "Seller", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/76d08aae-872b-4cd2-8c4b-dd9589a0c2c3",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceOpportunityId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceOpportunityId", label: "SF Opportunity ID", type: "text", required: true, placeholder: "e.g. 0064W00000AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "transcript-value-hypothesis-opp",
    title: "Transcript-Based Value Hypothesis Automation (Opp Based)",
    category: "Evaluations Assistant AI (opp based)",
    description: "Automated transcript analysis that extracts strategic insights from client conversations and builds value hypothesis reports.",
    longDescription: "This process uses call and Zoom transcripts to automatically gather strategic insights from client conversations. It consolidates the last 90 days of meetings, extracts objectives, initiatives, KPIs, and pain points directly from what was said, and organizes the findings into a clear value hypothesis report. The workflow builds a structured Google Slides presentation, updates a tracking sheet, and emails the final slide link. The result is a transcript-driven business hypothesis deck that sales and customer success teams can use to align directly with the client's own words.\n\nCategories: Opportunity-based intelligence, Business research, Sales enablement, Customer success, Automation\n\nHashtags: #OpportunityBased #TranscriptIntelligence #Automation #SalesEnablement #ValueHypothesis #CustomerSuccess",
    roles: ["SDR", "Seller", "SE", "CSM"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/ecb9d17f-b1d2-48cf-aadc-27eabbb16680",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceOpportunityId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceOpportunityId", label: "SF Opportunity ID", type: "text", required: true, placeholder: "e.g. 0064W00000AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "pendo-evaluation-assistant",
    title: "Pendo Evaluation Assistant",
    category: "Evaluations Assistant AI (opp based)",
    description: "Automated system that analyzes discovery meeting conversations to create comprehensive, professional evaluation documents for potential customers.",
    longDescription: "This automated system helps Pendo sales teams create comprehensive, professional evaluation documents for potential customers by analyzing their discovery meeting conversations. The AI analyzes all your customer conversations from the last 90 days and identifies the top 3 business problems the customer mentioned, finds exact quotes from the customer describing these problems, maps each problem to specific Pendo solutions, pulls relevant customer success stories from Pendo's library (with slide numbers for easy reference), creates competitive positioning against their current tools, and suggests next steps for the evaluation. The output is a polished, ready-to-share Google Doc containing: Customer Problems Section with 3 key challenges and direct customer quotes, Pendo Solutions Section showing how Pendo solves each problem with specific products and expected outcomes, Proof Points with real customer success stories and measurable results (e.g., 'Company X increased adoption by 200%'), Competitive Intelligence explaining why Pendo wins vs. competitors plus strategic questions to ask them, and an Action Plan with suggested next steps for moving the deal forward.\n\nCategories: Opportunity-based intelligence, Evaluation automation, Sales enablement, Competitive positioning, Customer success\n\nHashtags: #OpportunityBased #EvaluationAssistant #Automation #SalesEnablement #CompetitiveIntel #ProofPoints",
    roles: ["SE", "Seller", "CSM", "Leader"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/f5476910-38b1-4c0e-9c19-c49051f03bd6",
    samplePayload: { clientName: "", clientWebsite: "", yourEmail: "", yourName: "", salesforceOpportunityId: "" },
    parameters: [
      ...commonParameters,
      { name: "salesforceOpportunityId", label: "SF Opportunity ID", type: "text", required: true, placeholder: "e.g. 0064W00000AbCdEFG" }
    ],
    icon: MessageSquare,
    stage: "Research"
  },
  {
    id: "ae-portfolio-review",
    title: "AE Portfolio Review",
    category: "Portfolio Intelligence",
    description: "World-class company research system that conducts thorough investigations and delivers comprehensive JSON reports with market intelligence, technology stack, and competitive analysis.",
    longDescription: "This advanced workflow acts as your AI-powered company research engineer, conducting methodical and thorough investigations of any company. Using SERPER tools and multiple data sources, it researches company fundamentals, industry positioning, B2B/B2C models, product team structure, funding history, and technology stack. The system cross-references official domains, verifies information across reliable sources, and prioritizes recent data from the last 12-24 months. It analyzes official company sources, financial reports, press releases, LinkedIn profiles, and funding databases to deliver accurate, evidence-based insights. The output is a comprehensive JSON report including industry classification, business model analysis, competitor usage patterns (specifically checking for Pendo competitors like WalkMe, Appcues, Whatfix), product team metrics, funding rounds, revenue estimates, and verified technology stack. Perfect for Account Executives managing portfolios, conducting market research, or preparing strategic account plans with detailed competitive intelligence.\n\nCategories: Company research, Market intelligence, Competitive analysis, Portfolio management, Sales enablement\n\nHashtags: #CompanyResearch #MarketIntelligence #CompetitiveAnalysis #PortfolioView #SalesEnablement #TechStack #AIResearch",
    roles: ["Seller", "SE", "Leader", "RevOps"],
    webhook: "https://pendoio.app.n8n.cloud/webhook/40ef7dd8-82d9-4751-955a-d3fda0f7ef1c",
    samplePayload: { yourName: "", yourEmail: "" },
    parameters: [
      { name: "yourName", label: "Your Name (Required - Salesforce Owner)", type: "text", required: true, placeholder: "Enter your full name as it appears in Salesforce" },
      { name: "yourEmail", label: "Your Email", type: "email", required: true, placeholder: "your.email@pendo.io" }
    ],
    icon: FolderKanban,
    stage: "Research"
  }
];

export const categories = [
  "AI-Powered Research & Strategy Briefs",
  "Call/Transcript-Based Intelligence",
  "AI Audio Research & Briefings",
  "Evaluations Assistant AI (opp based)",
  "Portfolio Intelligence",
  "CX",
  "Personality & Behavioral Research"
] as const;
