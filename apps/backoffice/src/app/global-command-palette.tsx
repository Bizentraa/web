"use client";

import { useEffect, useState } from "react";

const commands = [
  {
    href: "/",
    label: "Open dashboard",
    phase: "P0",
    keywords: "home foundation status business branch access audit",
  },
  {
    href: "/appearance",
    label: "Open appearance settings",
    phase: "P0",
    keywords: "theme colour color brand mode palette",
  },
  {
    href: "/catalog",
    label: "Open catalog workspace",
    phase: "P1",
    keywords: "items prices tax customers suppliers master data",
  },
  {
    href: "/catalog",
    label: "Create item",
    phase: "P1",
    keywords: "product barcode sku price sellable",
  },
  {
    href: "/appearance",
    label: "Change Business theme",
    phase: "P0",
    keywords: "business owner preset dark light cache",
  },
] as const;

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = normalizedQuery
    ? commands.filter((command) =>
        `${command.label} ${command.phase} ${command.keywords}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : commands;

  return (
    <>
      <button
        aria-controls="global-command-palette"
        aria-expanded={open}
        className="global-command-floating"
        type="button"
        onClick={() => setOpen(true)}
      >
        Search
        <kbd>Ctrl K</kbd>
      </button>

      {open ? (
        <div
          className="global-command-overlay"
          id="global-command-palette"
          role="dialog"
          aria-label="Global command palette"
          aria-modal="true"
        >
          <div className="global-command-panel">
            <div className="global-command-search">
              <label>
                <span>Search navigation and actions</span>
                <input
                  autoFocus
                  placeholder="Try catalog, theme, item, customer..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <ul className="global-command-list">
              {filteredCommands.map((command) => (
                <li key={`${command.href}-${command.label}`}>
                  <a href={command.href} onClick={() => setOpen(false)}>
                    <span>{command.label}</span>
                    <small>{command.phase}</small>
                  </a>
                </li>
              ))}
            </ul>
            {!filteredCommands.length ? (
              <p className="global-command-empty">No matching command found.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
