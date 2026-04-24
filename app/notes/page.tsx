import notes from "@/data/substack/notes.json";

type NoteItem = {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  content: string;
  date: string | null;
  character: string | null;
  arc: string | null;
  url: string;
};

function formatDate(value: string | null) {
  if (!value) return "Pending sync";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function NotesPage() {
  const items = (notes.items as NoteItem[]) ?? [];

  return (
    <main className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Structured note stream</span>
        <h1>Notes</h1>
        <p>
          This page is wired for the normalized multi-Substack JSON feed. Once the live notes data
          is synced in, this becomes the canonical short-form stream on the site.
        </p>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>{items.length === 0 ? "No notes synced yet" : `${items.length} notes available`}</h2>
            <p className="notes-meta">
              Sources: {notes.source_count} | Generated: {notes.generated_at ?? "not yet run"}
            </p>
          </div>
        </div>

        <div className="notes-list">
          {items.map((item) => (
            <article key={item.id} className="card notes-item">
              <time dateTime={item.date ?? undefined}>{formatDate(item.date)}</time>
              <h3>{item.title || item.source_name}</h3>
              <p>{item.content}</p>
              <div className="chips">
                <span className="chip">{item.source_name}</span>
                {item.character ? <span className="chip">{item.character}</span> : null}
                {item.arc ? <span className="chip">{item.arc}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
