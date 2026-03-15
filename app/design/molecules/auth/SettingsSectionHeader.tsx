interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
}

export function SettingsSectionHeader({
  title,
  description,
}: SettingsSectionHeaderProps) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
    </div>
  );
}
