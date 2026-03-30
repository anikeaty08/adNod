import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CampaignInput } from "@/lib/fhenix-contract";
import { Button } from "@/components/shared/Button";
import { FileUpload } from "@/components/shared/FileUpload";
import { defaultCampaignForm } from "@/data/mock";
import { useAdNode } from "@/hooks/useAdNode";
import { useWallet } from "@/context/WalletContext";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  creativeURI: z.string().min(1),
  category: z.string().min(2),
  budget: z.string().min(1),
  pricingModel: z.enum(["CPC", "CPM"]),
  rate: z.coerce.number().int().positive(),
});

export function CampaignForm() {
  const [status, setStatus] = useState<string>("Ready to create a new campaign.");
  const { connected } = useWallet();
  const { createCampaign, isPending } = useAdNode();
  const form = useForm<CampaignInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultCampaignForm,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!connected) {
      setStatus("Connect your wallet provider before creating a campaign.");
      return;
    }

    if (values.pricingModel !== "CPC") {
      setStatus("Only CPC campaigns are enabled until CPM logic is added on-chain.");
      return;
    }

    setStatus("Registering campaign on AdNode...");
    try {
      const result = await createCampaign({
        creativeURI: values.creativeURI,
        category: values.category,
        budget: values.budget,
        cpc: values.rate,
        title: values.title,
        description: values.description,
      });
      setStatus(`Campaign ${result.campaignId} submitted on-chain. Tx: ${result.hash}`);
      form.reset(defaultCampaignForm);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Campaign creation failed.");
    }
  });

  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold">Create campaign</h3>
          <p className="mt-2 text-sm text-muted-foreground">Add campaign details, budget, and pricing for your live listing.</p>
        </div>
        <div className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
          Hoster console
        </div>
      </div>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Campaign title</span>
            <input
              className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              placeholder="Enter campaign title"
              {...form.register("title")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Creative URI</span>
            <input
              className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              placeholder="ipfs://..."
              {...form.register("creativeURI")}
            />
          </label>
        </div>
        <label className="space-y-2 text-sm">
          <span>Category</span>
          <input
            className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
            placeholder="DeFi, Gaming, Tooling..."
            {...form.register("category")}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span>Description</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
            placeholder="Describe the campaign goals, audience, and creative direction"
            {...form.register("description")}
          />
        </label>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span>Budget (MAS)</span>
            <input
              type="text"
              className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              placeholder="0.1"
              {...form.register("budget")}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Pricing model</span>
            <select className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" {...form.register("pricingModel")}>
              <option value="CPC">CPC</option>
              <option value="CPM">CPM</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>Rate (MAS)</span>
            <input
              type="number"
              step="0.1"
              className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              placeholder="0"
              {...form.register("rate")}
            />
          </label>
        </div>
        <FileUpload
          onUploaded={(uri) => {
            form.setValue("creativeURI", uri, { shouldValidate: true });
            setStatus(`Creative uploaded to ${uri}`);
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{status}</p>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create on-chain campaign"}
          </Button>
        </div>
      </form>
    </div>
  );
}
