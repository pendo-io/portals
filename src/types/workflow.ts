import { LucideIcon } from "lucide-react";

export interface WorkflowParameter {
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'textarea';
  required: boolean;
  placeholder?: string;
}

export interface Workflow {
  id: string;
  title: string;
  category: string;
  description: string;
  roles: string[];
  webhook: string;
  samplePayload: Record<string, any>;
  parameters: WorkflowParameter[];
  icon: LucideIcon;
  stage?: string;
  longDescription?: string;
  publicSlug?: string; // If set, workflow has a public shareable link
  isBeta?: boolean; // If true, show Beta badge
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export const ROLES = ["SDR", "Seller", "SE", "CSM", "Marketing", "Leader", "RevOps"] as const;
export type Role = typeof ROLES[number];