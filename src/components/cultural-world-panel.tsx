"use client";

/**
 * World Around This Panel
 *
 * The cultural connection panel that shows what surrounds
 * a given piece of culture — related books, artworks, themes,
 * and periods. This is the seed of the Cultural Graph UI.
 *
 * Design follows Vision §4 (Every Discovery is a Doorway),
 * §5 (Connect Art and Books), §7 (Make a Book a World),
 * and §21 (Explainable Discovery).
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  Globe,
  LoaderCircle,
  Palette,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CulturalWorld,
  CulturalWorldConnection,
  CulturalEntity,
} from "@/types/cultural-graph";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorldAroundThisProps {
  /** The ID of the primary entity (MediaItem ID or book ID). */
  itemId: string;
  /** The type of the primary entity. */
  itemType: "artwork" | "book";
  /** The title (for optimistic rendering while loading). */
  itemTitle?: string;
  /** Optional author for book entities. */
  author?: string;
  /** Optional source. */
  source?: string;
  /** Optional source URL for the primary entity. */
  sourceUrl?: string;
  /** Optional subjects/tags for optimistic rendering. */
  subjects?: string[];
  /** Called when the user clicks a connected entity. */
  onSelectEntity?: (entity: CulturalEntity) => void;
  /** Optional CSS class. */
  className?: string;
}

// ─── Connection Card ────────────────────────────────────────────────────────

function ConnectionCard({
  entity,
  onSelect,
}: {
  entity: CulturalEntity;
  onSelect?: (entity: CulturalEntity) => void;
}) {
  const isBook = entity.type === "book";
  const Icon = isBook ? BookOpen : Palette;

  const readHref = isBook ? buildBookHref(entity) : null;
  const viewUrl = !isBook
    ? entity.sourceUrl || entity.imageUrl
    : entity.sourceUrl;

  if (onSelect) {
    return (
      <button
        type="button"
        className="cultural-card"
        onClick={() => onSelect(entity)}
      >
        {entity.imageUrl && (
          <div className="cultural-card-image">
            <img
              src={entity.imageUrl}
              alt={entity.name}
              loading="lazy"
            />
          </div>
        )}
        <div className="cultural-card-copy">
          <div className="cultural-card-type">
            <Icon className="h-3 w-3" />
            <span>{isBook ? "Book" : "Artwork"}</span>
          </div>
          <h4 className="cultural-card-title">{entity.name}</h4>
          <p className="cultural-card-meta">
            {entity.metadata.authors ||
              (entity.source as any)?.provider ||
              ""}
            {entity.date ? ` · ${entity.date}` : ""}
          </p>
        </div>
      </button>
    );
  }

  // If it's a book, link to the reader
  if (readHref) {
    return (
      <Link href={readHref} className="cultural-card">
        {entity.imageUrl && (
          <div className="cultural-card-image">
            <img
              src={entity.imageUrl}
              alt={entity.name}
              loading="lazy"
            />
          </div>
        )}
        <div className="cultural-card-copy">
          <div className="cultural-card-type">
            <BookOpen className="h-3 w-3" />
            <span>Book</span>
          </div>
          <h4 className="cultural-card-title">{entity.name}</h4>
          <p className="cultural-card-meta">
            {entity.metadata.authors || ""}
            {entity.date ? ` · ${entity.date}` : ""}
          </p>
        </div>
      </Link>
    );
  }

  // For artworks, link to source or open in new tab
  if (viewUrl) {
    return (
      <a
        href={viewUrl}
        target="_blank"
        rel="noreferrer"
        className="cultural-card"
      >
        {entity.imageUrl && (
          <div className="cultural-card-image">
            <img
              src={entity.imageUrl}
              alt={entity.name}
              loading="lazy"
            />
          </div>
        )}
        <div className="cultural-card-copy">
          <div className="cultural-card-type">
            <Palette className="h-3 w-3" />
            <span>Artwork</span>
          </div>
          <h4 className="cultural-card-title">{entity.name}</h4>
          <p className="cultural-card-meta">
            {entity.metadata.authors || ""}
            {entity.date ? ` · ${entity.date}` : ""}
          </p>
        </div>
      </a>
    );
  }

  return (
    <div className="cultural-card">
      {entity.imageUrl && (
        <div className="cultural-card-image">
          <img src={entity.imageUrl} alt={entity.name} loading="lazy" />
        </div>
      )}
      <div className="cultural-card-copy">
        <div className="cultural-card-type">
          <Icon className="h-3 w-3" />
          <span>{isBook ? "Book" : "Artwork"}</span>
        </div>
        <h4 className="cultural-card-title">{entity.name}</h4>
        <p className="cultural-card-meta">
          {entity.metadata.authors || ""}
          {entity.date ? ` · ${entity.date}` : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Connection Group ───────────────────────────────────────────────────────

function ConnectionGroup({
  connection,
  onSelect,
}: {
  connection: CulturalWorldConnection;
  onSelect?: (entity: CulturalEntity) => void;
}) {
  if (connection.entities.length === 0) return null;

  return (
    <div className="cultural-group">
      <div className="cultural-group-header">
        <span className="cultural-group-label">{connection.label}</span>
        <span className="cultural-group-count">
          {connection.entities.length}
        </span>
      </div>
      <div className="cultural-group-items">
        {connection.entities.map((entity) => (
          <ConnectionCard
            key={entity.id}
            entity={entity}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WorldAroundThis({
  itemId,
  itemType,
  itemTitle,
  author,
  source,
  sourceUrl,
  subjects,
  onSelectEntity,
  className,
}: WorldAroundThisProps) {
  const [world, setWorld] = React.useState<CulturalWorld | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  // Stabilize subjects to avoid re-fetching on every render.
  const subjectsKey = React.useMemo(
    () => (subjects?.length ? subjects.join(",") : ""),
    [subjects],
  );

  // Build the fetch URL once to avoid unstable dependencies.
  const fetchUrl = React.useMemo(() => {
    const params = new URLSearchParams({ itemId, itemType });
    if (itemTitle) params.set("title", itemTitle);
    if (author) params.set("author", author);
    if (source) params.set("source", source);
    if (sourceUrl) params.set("sourceUrl", sourceUrl);
    if (subjectsKey) params.set("subjects", subjectsKey);
    return `/api/cultural-context?${params}`;
  }, [itemId, itemType, itemTitle, author, source, sourceUrl, subjectsKey]);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchWorld() {
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) {
          throw new Error(`Cultural context unavailable (${res.status})`);
        }

        const data: CulturalWorld = await res.json();
        if (!cancelled) {
          setWorld(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load cultural context",
          );
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setWorld(null);
    setError(null);
    void fetchWorld();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl]);

  const totalConnections =
    world?.connections.reduce((sum, c) => sum + c.entities.length, 0) ?? 0;

  if (loading) {
    return (
      <div className={cn("cultural-world-panel", "cultural-world-loading", className)}>
        <div className="cultural-world-loading-inner">
          <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
          <span>Discovering cultural connections…</span>
        </div>
      </div>
    );
  }

  if (error || !world || totalConnections === 0) {
    return null; // Gracefully hide if no connections found
  }

  const visibleConnections = expanded
    ? world.connections
    : world.connections.slice(0, 3);

  return (
    <div className={cn("cultural-world-panel", className)}>
      <div className="cultural-world-header">
        <div className="cultural-world-header-text">
          <Compass className="h-4 w-4 text-accent" />
          <h3>Open the World Around This</h3>
        </div>
        <p className="cultural-world-description">
          {itemType === "artwork"
            ? "Discover books, related artworks, and cultural connections surrounding this work."
            : "Explore the art, places, and cultural world surrounding this book."}
        </p>
      </div>

      <div className="cultural-world-connections">
        {visibleConnections.map((connection) => (
          <ConnectionGroup
            key={connection.relationshipType}
            connection={connection}
            onSelect={onSelectEntity}
          />
        ))}
      </div>

      {world.connections.length > 3 && !expanded && (
        <button
          type="button"
          className="cultural-world-expand"
          onClick={() => setExpanded(true)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            Discover {totalConnections} more connections
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildBookHref(entity: CulturalEntity): string {
  const bookId = entity.source.nativeId;
  const params = new URLSearchParams();
  params.set("source", "gutendex");
  params.set("id", bookId);
  params.set("title", entity.name);
  params.set("authors", entity.metadata.authors || "Unknown author");
  params.set(
    "formats",
    JSON.stringify({
      "text/plain; charset=utf-8": `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`,
    }),
  );
  return `/read?${params.toString()}`;
}
