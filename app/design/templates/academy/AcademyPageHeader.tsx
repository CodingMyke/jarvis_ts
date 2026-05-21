import { AppPageHeader, type AppPageHeaderProps } from "@/app/design/templates/shared/AppPageHeader";

export type AcademyPageHeaderProps = AppPageHeaderProps;

export function AcademyPageHeader({ title, subtitle }: AcademyPageHeaderProps) {
  return <AppPageHeader title={title} subtitle={subtitle} />;
}
