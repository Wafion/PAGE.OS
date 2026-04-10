import Link from "next/link";
import type { SearchResult } from "@/adapters/sourceManager";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "./ui/progress";

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

export function SearchResultCard({ book }: { book: SearchResult & { progress?: number } }) {
  const href = `/read?${createBookQuery(book)}`;

  return (
    <Link href={href} className="h-full">
      <Card className="group flex h-full flex-col justify-between border bg-card transition-all hover:border-accent hover:box-glow hover:bg-accent/10">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Title-</p>
            <p className="font-medium text-foreground group-hover:text-accent leading-tight">
              {book.title}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Author-</p>
            <p className="font-medium text-foreground truncate">{book.authors || 'Unknown'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start p-4 pt-0">
          <p className="text-xs text-muted-foreground/80 w-full">
            <span className="text-accent">src:</span> {book.source}
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
