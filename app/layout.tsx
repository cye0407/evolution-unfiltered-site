import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolution Unfiltered",
  description:
    "Four billion years. One narrator. Zero apologies. Evolution Unfiltered is a narrative science world built across episodes, voices, notes, and story arcs.",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/start-here", label: "Start Here" },
  { href: "/the-story", label: "The Story" },
  { href: "/voices", label: "Voices" },
  { href: "/listen", label: "Listen" },
  { href: "/notes", label: "Notes" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="page-shell site-header-inner">
            <Link href="/" className="site-mark">
              Evolution Unfiltered
            </Link>
            <nav className="site-nav" aria-label="Primary">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="page-shell">Evolution Unfiltered. Narrative science without the museum voice.</div>
        </footer>
      </body>
    </html>
  );
}
