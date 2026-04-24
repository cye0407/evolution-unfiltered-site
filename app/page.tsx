import Link from "next/link";

const routeCards = [
  {
    href: "/start-here",
    title: "Start Here",
    copy: "The cleanest on-ramp for new readers who need the premise fast.",
  },
  {
    href: "/the-story",
    title: "The Story",
    copy: "Narrative framing, formats, and how the universe hangs together.",
  },
  {
    href: "/voices",
    title: "Voices",
    copy: "Who speaks in this world and why each point of view matters.",
  },
  {
    href: "/listen",
    title: "Listen",
    copy: "The audio layer, episode framing, and where the core narrative lives.",
  },
  {
    href: "/notes",
    title: "Notes",
    copy: "Structured short-form notes aggregated from the three Substack feeds.",
  },
  {
    href: "/emergence-pr",
    title: "Emergence PR",
    copy: "The in-universe representation layer behind the project.",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">Season 1 migration scaffold</span>
            <h1>Four billion years. One narrator. Zero apologies.</h1>
            <p className="hero-copy">
              This is the new Vercel-native home for Evolution Unfiltered: a narrative science
              universe built across story pages, voices, listening surfaces, and a structured notes
              stream drawn from multiple Substacks.
            </p>
            <div className="cta-row">
              <Link href="/start-here" className="button">
                Start here
              </Link>
              <Link href="/notes" className="button-secondary">
                Open notes
              </Link>
            </div>
          </div>
          <aside className="card hero-card">
            <h2>What this scaffold already assumes</h2>
            <p>
              WordPress is now a migration source, not the platform. The new site should preserve
              core URLs, then expand into a structured narrative system with reusable notes,
              characters, and arcs.
            </p>
            <div className="chips">
              <span className="chip">WordPress export backed up</span>
              <span className="chip">Uploads archived</span>
              <span className="chip">Notes pipeline ready</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Migration baseline</span>
            <h2>Routes to rebuild first</h2>
          </div>
        </div>
        <div className="route-list">
          {routeCards.map((card) => (
            <Link key={card.href} href={card.href} className="card">
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
