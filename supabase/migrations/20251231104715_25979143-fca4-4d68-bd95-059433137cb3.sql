-- Insert the new DISC Strategy Brief workflow
INSERT INTO public.workflows (
  title,
  description,
  long_description,
  category,
  webhook_url,
  workflow_type,
  original_id,
  roles,
  stage,
  is_active,
  publish_status,
  created_by
)
VALUES (
  'DISC Strategy Brief',
  'AI-powered DISC personality analysis that creates comprehensive behavioral insights and communication strategy briefs for improved stakeholder engagement.',
  'This workflow leverages advanced AI to analyze available information and generate a comprehensive DISC Strategy Brief. It provides: Behavioral Profile Analysis (dominant traits, communication preferences, decision-making style), Stakeholder Mapping (key personalities, influence dynamics, relationship insights), Communication Strategy (tailored messaging approaches, meeting preparation tips, email templates), Engagement Recommendations (do''s and don''ts, preferred interaction styles, potential friction points), and Action Plan (specific next steps, conversation starters, follow-up strategies). The system produces a professional Google Slides presentation and Google Doc, perfect for sales teams, customer success managers, and executives preparing for high-stakes meetings and relationship building.

Categories: Research intelligence, Behavioral analysis, Communication strategy, Stakeholder engagement, Automation

Hashtags: #DISCStrategy #BehavioralIntelligence #CommunicationStrategy #StakeholderEngagement #SalesEnablement #Automation',
  'Research-Based Intelligence',
  'https://pendoio.app.n8n.cloud/webhook/6e871676-d1b0-4a9b-9961-26d0d680c317',
  'salesforce-account',
  'disc-strategy-brief',
  ARRAY['SDR', 'Seller', 'SE', 'CSM', 'Leader'],
  'Research',
  true,
  'production',
  (SELECT id FROM auth.users LIMIT 1)
);