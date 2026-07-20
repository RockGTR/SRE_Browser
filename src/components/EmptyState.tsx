export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span aria-hidden="true">◇</span><h3>{title}</h3><p>{message}</p></div>;
}
