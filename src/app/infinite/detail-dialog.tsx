"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  Globe,
  Languages,
  MapPin,
  MoreHorizontal,
  Palette,
  Ruler,
  ScrollText,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MediaItem } from "./types";

type MediaDetailDialogProps = {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DetailTabKey = "about" | "details" | "related";

const TABS_BY_TYPE: Record<MediaItem["type"], Array<{ key: DetailTabKey; label: string }>> = {
  artwork: [
    { key: "about", label: "About" },
    { key: "details", label: "Details" },
    { key: "related", label: "Related Works" },
  ],
  book: [
    { key: "about", label: "About" },
    { key: "details", label: "Details" },
    { key: "related", label: "Contents" },
  ],
};

function buildReadHref(item: MediaItem) {
  if (item.type !== "book") return "#";

  const bookId = item.id?.replace(/^gutendex-/, "") ?? item.title;
  const params = new URLSearchParams();
  params.set("source", "gutendex");
  params.set("id", bookId);
  params.set("title", item.title);
  params.set("authors", item.creator || "Unknown author");
  params.set(
    "formats",
    JSON.stringify({
      "text/plain; charset=utf-8": `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`,
    }),
  );
  return `/read?${params.toString()}`;
}

function formatLabel(item: MediaItem) {
  return item.type === "book" ? "Book" : "Artwork";
}

function getAccentClasses(item: MediaItem) {
  return item.type === "book"
    ? {
        kicker: "text-sky-400",
        primaryButton:
          "bg-sky-500 text-slate-950 hover:bg-sky-400 dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300",
      }
    : {
        kicker: "text-violet-300",
        primaryButton:
          "bg-violet-400 text-slate-950 hover:bg-violet-300 dark:bg-violet-400 dark:text-slate-950 dark:hover:bg-violet-300",
      };
}

function getMetadata(item: MediaItem) {
  if (item.type === "book") {
    return [
      { icon: Languages, label: "Language", value: item.language ?? "English" },
      { icon: Calendar, label: "First Published", value: item.firstPublished ?? item.year ?? "Unknown" },
      { icon: Globe, label: "Source", value: item.sourceName ?? "Project Gutenberg" },
      { icon: FileText, label: "File Format", value: item.fileFormats?.join(", ") ?? "EPUB, PDF, TXT" },
      { icon: ScrollText, label: "Pages", value: item.pages ?? "Unknown" },
      { icon: BookOpen, label: "ISBN", value: item.isbn ?? "--" },
    ];
  }

  return [
    { icon: Palette, label: "Medium", value: item.medium ?? "Oil on canvas" },
    { icon: Ruler, label: "Dimensions", value: item.dimensions ?? "Unknown" },
    { icon: MapPin, label: "Location", value: item.location ?? "Unknown" },
    { icon: Globe, label: "Collection", value: item.collection ?? "Unknown" },
    { icon: FileText, label: "Accession Number", value: item.accessionNumber ?? "Unknown" },
    { icon: ScrollText, label: "Credit Line", value: item.creditLine ?? "Unknown" },
  ];
}

export function MediaDetailDialog({ item, open, onOpenChange }: MediaDetailDialogProps) {
  const [activeTab, setActiveTab] = React.useState<DetailTabKey>("about");

  React.useEffect(() => {
    if (open) {
      setActiveTab("about");
    }
  }, [open, item?.id, item?.url]);

  if (!item) {
    return null;
  }

  const tabs = TABS_BY_TYPE[item.type];
  const accents = getAccentClasses(item);
  const metadata = getMetadata(item);
  const tags = item.tags ?? item.genres ?? [];
  const description =
    item.description ??
    (item.type === "book"
      ? `${item.title} is a public-domain title by ${item.creator}.`
      : `${item.title} is a public-domain artwork by ${item.creator}.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pageos-detail-dialog border-0 bg-transparent p-0 shadow-none [&>button]:hidden sm:max-w-[min(1120px,94vw)]">
        <div className="pageos-detail-panel">
          <div className="pageos-detail-toolbar">
            <DialogClose asChild>
              <button className="pageos-detail-icon-button" aria-label="Close details">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>

            <div className="flex items-center gap-2">
              <button className="pageos-detail-icon-button" aria-label="Save item">
                <Bookmark className="h-4 w-4" />
              </button>
              <button className="pageos-detail-icon-button" aria-label="Share item">
                <Share2 className="h-4 w-4" />
              </button>
              <button className="pageos-detail-icon-button" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="pageos-detail-grid">
            <div className="pageos-detail-art-column">
              <div className={cn("pageos-detail-image-shell", item.type === "book" ? "book" : "artwork")}>
                <img src={item.url} alt={item.title} className="pageos-detail-image" />
              </div>

              <div className="flex flex-wrap gap-3">
                {item.type === "book" ? (
                  <>
                    <Button asChild className={cn("h-11 rounded-xl px-5", accents.primaryButton)}>
                      <Link href={buildReadHref(item)}>
                        <BookOpen className="h-4 w-4" />
                        Start Reading
                      </Link>
                    </Button>
                    {item.detailUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 rounded-xl border-white/10 bg-transparent px-5 text-foreground hover:bg-white/5"
                      >
                        <a href={item.detailUrl} target="_blank" rel="noreferrer">
                          Download
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {item.detailUrl && (
                      <Button asChild className={cn("h-11 rounded-xl px-5", accents.primaryButton)}>
                        <a href={item.detailUrl} target="_blank" rel="noreferrer">
                          View Full Resolution
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {item.sourceUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 rounded-xl border-white/10 bg-transparent px-5 text-foreground hover:bg-white/5"
                      >
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                          Visit Source
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pageos-detail-copy">
              <div>
                <p className={cn("pageos-detail-kicker", accents.kicker)}>{formatLabel(item)}</p>
                <h2 className="pageos-detail-title">{item.title}</h2>
                <p className={cn("mt-3 text-xl", accents.kicker)}>{item.creator}</p>
                <p className="mt-2 text-sm text-white/70">{item.year}</p>
              </div>

              {tags.length > 0 && (
                <div className="pageos-detail-chip-row">
                  {tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="pageos-detail-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="pageos-detail-meta-list">
                {metadata.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="pageos-detail-meta-row">
                    <div className="pageos-detail-meta-label">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    <span className="text-white/86">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pageos-detail-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn("pageos-detail-tab", activeTab === tab.key && "active")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pageos-detail-lower">
            <div className="pageos-detail-section">
              <p className="pageos-detail-section-kicker">
                {item.type === "book" ? "Summary" : "Description"}
              </p>
              <p className="pageos-detail-description">{description}</p>
            </div>

            {tags.length > 0 && (
              <div className="pageos-detail-section">
                <p className="pageos-detail-section-kicker">Tags</p>
                <div className="pageos-detail-tag-cloud">
                  {tags.map((tag) => (
                    <span key={tag} className="pageos-detail-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pageos-detail-credits">
            <div className="pageos-detail-credits-header">
              <p className="pageos-detail-section-kicker">Credits & Source</p>
              {item.rightsLabel && <span className="pageos-detail-badge">{item.rightsLabel}</span>}
            </div>

            <div className="pageos-detail-credits-grid">
              <div className="pageos-detail-credit-card">
                <div className="pageos-detail-credit-logo">{item.sourceName?.slice(0, 4) ?? "PD"}</div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-white/92">
                    Provided by {item.sourceName ?? "Public archive"}
                  </p>
                  <p className="text-sm leading-7 text-white/64">
                    {item.type === "book"
                      ? "This work is available through a public-domain library source."
                      : "This artwork is available through a public-domain museum or archive source."}
                  </p>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200"
                    >
                      View source
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="pageos-detail-attribution">
                <p className="text-base font-medium text-white/92">Attribution</p>
                <p className="text-sm leading-7 text-white/64">
                  {item.attribution ?? `${item.title}, ${item.year}. ${item.creator}.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
