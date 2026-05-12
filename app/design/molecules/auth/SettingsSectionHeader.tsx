import { SectionHeader } from "@/app/_shared/ui";

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
}

export function SettingsSectionHeader({
  title,
  description,
}: SettingsSectionHeaderProps) {
  return <SectionHeader description={description} title={title} />;
}
