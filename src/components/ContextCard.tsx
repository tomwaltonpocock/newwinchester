export function ContextCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="card">
      <h3 className="font-serif text-stone-900">{title}</h3>
      <p className="mt-2 text-stone-700">{body}</p>
    </article>
  );
}
