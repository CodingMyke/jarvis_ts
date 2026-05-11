"use client";

import { Button } from "@/app/design/atoms/shared/Button";

export interface ReelQuickCreateProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void>;
}

export function ReelQuickCreate({
  value,
  disabled = false,
  onChange,
  onSubmit,
}: ReelQuickCreateProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="flex-1 space-y-2 text-sm text-muted">
          <span>New reel idea</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Write the core idea for the reel"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none"
          />
        </label>
        <div className="flex items-end">
          <Button type="button" onClick={() => void onSubmit()} disabled={disabled}>
            Create reel
          </Button>
        </div>
      </div>
    </section>
  );
}
