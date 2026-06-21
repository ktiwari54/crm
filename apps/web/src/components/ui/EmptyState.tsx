export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}