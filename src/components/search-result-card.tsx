import Link from "next/link";
import type { SearchResult } from "@/adapters/sourceManager";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "./ui/progress";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { Bookmark, Share2, Star } from "lucide-react";

function createBookQuery(book: SearchResult): string {
  const params = new URLSearchParams();
  params.set("source", book.source);
  params.set("id", book.id);
  params.set("title", book.title);
  params.set("authors", book.authors);

  if (book.source === "gutendex") {
    params.set("formats", JSON.stringify(book.formats));
  }

  // You can add support for other sources here later, if needed.
  
  return params.toString();
}

function getBookCover(book: SearchResult) {
  if (book.source === "gutendex") {
    return `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`;
  }

  return "";
}

export function SearchResultCard({
  book,
  variant,
}: {
  book: SearchResult & { progress?: number };
  variant?: "classic" | "simple";
}) {
  const { uiMode } = useReaderSettings();
  const resolvedVariant = variant ?? (uiMode === "lounge" ? "simple" : "classic");
  const href = `/read?${createBookQuery(book)}`;

  if (resolvedVariant === "simple") {
    return (
      <Link href={href} className="library-result-card">
        <div
          className="library-result-cover"
          style={
            getBookCover(book)
              ? { backgroundImage: `url(${getBookCover(book)})` }
              : undefined
          }
        />
        <div className="library-result-copy">
          <p className="library-result-source">
            {book.source === "gutendex" ? "Project Gutenberg" : "Web result"}
          </p>
          <h3>{book.title}</h3>
          <p className="library-result-author">by {book.authors || "Unknown author"}</p>
          <div className="library-result-rating">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>4.6</span>
          </div>
          <div className="library-result-actions">
            <span>Start reading</span>
            <Share2 className="h-4 w-4" />
            <Bookmark className="h-4 w-4" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="h-full">
      <Card className="group flex h-full flex-col justify-between border bg-card transition-all hover:border-accent hover:box-glow hover:bg-accent/10">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {uiMode === "lounge" ? "Title" : "Title-"}
            </p>
            <p className="font-medium text-foreground group-hover:text-accent leading-tight">
              {book.title}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {uiMode === "lounge" ? "Author" : "Author-"}
            </p>
            <p className="font-medium text-foreground truncate">{book.authors || 'Unknown'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start p-4 pt-0">
          <p className="text-xs text-muted-foreground/80 w-full">
            <span className="text-accent">{uiMode === "lounge" ? "Source:" : "src:"}</span> {book.source === "gutendex" && uiMode === "lounge" ? "Project Gutenberg" : book.source}
          </p>
          {book.progress !== undefined && book.progress > 0 && (
            <div className="w-full mt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>PROGRESS</span>
                <span>{Math.round(book.progress)}%</span>
              </div>
              <Progress
                value={book.progress}
                className="h-1 bg-input [&>div]:bg-accent"
              />
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

