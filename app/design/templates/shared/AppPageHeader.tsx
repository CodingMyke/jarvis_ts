export interface AppPageHeaderProps {
  title: string;
  subtitle: string;
}

export function AppPageHeader({ title, subtitle }: AppPageHeaderProps) {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
    </div>
  );
}
