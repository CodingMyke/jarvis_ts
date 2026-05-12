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
    <form
      className="flex flex-col gap-3 md:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <label className="flex-1">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Write the core idea for the reel"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-foreground outline-none"
        />
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={disabled}>
          Create reel
        </Button>
      </div>
    </form>
  );
}
