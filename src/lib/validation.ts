import { z } from 'zod';

// Common validation schemas for user inputs
export const querySchema = z.string()
  .trim()
  .min(1, 'Query cannot be empty')
  .max(5000, 'Query is too long (max 5000 characters)');

export const clientNameSchema = z.string()
  .trim()
  .min(1, 'Client name is required')
  .max(200, 'Client name is too long (max 200 characters)');

export const clientWebsiteSchema = z.string()
  .trim()
  .url('Invalid website URL')
  .max(500, 'Website URL is too long (max 500 characters)');

export const emailSchema = z.string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email is too long (max 255 characters)');

export const nameSchema = z.string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name is too long (max 200 characters)');

export const salesforceAccountIdSchema = z.string()
  .trim()
  .refine((val) => val === '' || val.length === 18, {
    message: 'Salesforce Account ID must be exactly 18 characters'
  })
  .optional()
  .or(z.literal(''));

export const opportunityIdSchema = z.string()
  .trim()
  .max(18, 'Opportunity ID is too long (max 18 characters)')
  .optional()
  .or(z.literal(''));

// Combined workflow form schema
export const workflowFormSchema = z.object({
  'Client Name': clientNameSchema,
  'Client Website': clientWebsiteSchema,
  'Your email ': emailSchema,
  'Your Name': nameSchema,
  'Salesforce Account ID': salesforceAccountIdSchema,
  'SF Opportunity ID': opportunityIdSchema,
}).partial();

// Validate user query for chat interfaces
export function validateQuery(input: string): { valid: boolean; error?: string; value?: string } {
  const result = querySchema.safeParse(input);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0]?.message || 'Invalid input' };
  }
  return { valid: true, value: result.data };
}

// Validate workflow form data
export function validateWorkflowForm(data: Record<string, string>): { valid: boolean; error?: string; value?: Record<string, string> } {
  const result = workflowFormSchema.safeParse(data);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0]?.message || 'Invalid form data' };
  }
  return { valid: true, value: result.data as Record<string, string> };
}
