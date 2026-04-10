import { z } from "zod";

const chainIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Chain id must be numeric.")
  .refine((value) => Number(value) > 0, "Chain id must be positive.");

const addressSchema = z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "Wallet address must be a valid EVM address.");

const creativeUriSchema = z
  .string()
  .trim()
  .min(1, "Creative URI is required.")
  .refine((value) => value.startsWith("ipfs://") || value.startsWith("https://") || value.startsWith("http://"), "Creative URI must be ipfs:// or http(s)://.");

export const campaignMetadataSchema = z.object({
  chainCampaignId: chainIdSchema,
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(500),
  creativeURI: creativeUriSchema,
  category: z.string().trim().min(2).max(40),
  pricingModel: z.enum(["CPC", "CPM"]),
  rate: z.string().trim().regex(/^\d+(\.\d{1,6})?$/, "Rate must be a positive decimal value with up to 6 decimals."),
  advertiser: addressSchema,
});

export const slotMetadataSchema = z.object({
  chainSlotId: chainIdSchema,
  siteName: z.string().trim().min(2).max(80),
  siteUrl: z.string().trim().url("Site URL must be a valid URL."),
  category: z.string().trim().min(2).max(40),
  dailyTrafficEstimate: z.string().trim().regex(/^\d+$/, "Daily traffic estimate must be a whole number."),
  developer: addressSchema,
  assignedCampaignId: z.string().trim().regex(/^\d*$/, "Assigned campaign id must be numeric."),
});
