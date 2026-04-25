import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/setup/calendar"
        className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
      >
        Vai al setup calendario
      </Link>
    </div>
  );
}
