import { NextRequest, NextResponse } from "next/server";
import {
  getRecommendationShelf,
  isRecommendationGenreKey,
  type RecommendationGenreKey,
} from "@/lib/recommendations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawGenre = searchParams.get("genre")?.trim() ?? "popular";
  const rawLimit = Number(searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), 24)
    : 12;

  const genre: RecommendationGenreKey = isRecommendationGenreKey(rawGenre)
    ? rawGenre
    : "popular";

  try {
    const shelf = await getRecommendationShelf(genre, limit);

    return NextResponse.json(shelf, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Recommendation route failed:", error);
    return NextResponse.json(
      { error: "Failed to build recommendation shelf" },
      { status: 500 },
    );
  }
}
