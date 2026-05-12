export interface DividerProps {
  className?: string;
}

export function Divider({ className = "" }: DividerProps) {
  return <div className={["ui-divider border-t", className].join(" ").trim()} />;
}
