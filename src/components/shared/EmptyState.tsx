export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-panel rounded-[32px] p-10 text-center">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
