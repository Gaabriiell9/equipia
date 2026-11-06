export default function Loading() {
  return (
    <div className="flex flex-col gap-5 pt-2" aria-busy="true" aria-label="Chargement">
      <div className="skeleton h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
