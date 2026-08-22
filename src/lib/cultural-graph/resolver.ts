/**
 * PAGE.OS Cultural Context Resolver
 *
 * This module converts source data (MediaItem, SearchResult) into
 * the normalized Cultural Graph model and resolves connections
 * between cultural objects.
 *
 * The resolver operates in two modes:
 *  1. Metadata-based: matches entities by tags, subjects, periods, cultures
 *  2. Cross-source: connects books ↔ artworks via shared cultural signals
 *
 * Design follows Vision §49 (Trust Model):
 *  - Relationships carry confidence levels
 *  - Source facts are never blurred with derived connections
 *  - Missing data is explicit
 */

import type {
  CulturalEntity,
  CulturalEntityMetadata,
  CulturalRelationship,
  CulturalWorld,
  CulturalWorldConnection,
  RelationshipType,
  ConnectedEntity,
} from "@/types/cultural-graph";
import type { MediaItem } from "@/app/infinite/types";

// ─── Normalization Helpers ──────────────────────────────────────────────────

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function extractTokens(value: string): Set<string> {
  const normalized = normalizeText(value);
  return new Set(normalized.split(/\s+/).filter((t) => t.length > 2));
}

function tokenizeArray(items: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const item of items) {
    for (const token of extractTokens(item)) {
      tokens.add(token);
    }
  }
  return tokens;
}

// ─── Period Mapping ─────────────────────────────────────────────────────────

/**
 * Maps year strings to broad cultural periods.
 * Used to connect entities that share a historical period
 * even when source metadata doesn't explicitly tag the period.
 */
export function yearToPeriod(yearStr: string): string | null {
  const match = yearStr.match(/(\d{3,4})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  if (Number.isNaN(year)) return null;

  if (year < 500) return "Ancient";
  if (year < 1400) return "Medieval";
  if (year < 1600) return "Renaissance";
  if (year < 1750) return "Baroque";
  if (year < 1850) return "Enlightenment";
  if (year < 1910) return "Victorian";
  if (year < 1945) return "Modern";
  return "Contemporary";
}

function datesOverlap(
  a: { start?: number; end?: number },
  b: { start?: number; end?: number },
): boolean {
  if (a.start == null || b.start == null) return false;
  const aEnd = a.end ?? a.start + 50;
  const bEnd = b.end ?? b.start + 50;
  return a.start <= bEnd && b.start <= aEnd;
}

// ─── Entity Conversion ──────────────────────────────────────────────────────

/**
 * Convert a MediaItem (from Infinite) into a CulturalEntity.
 * This normalizes artwork data into the graph model.
 */
export function mediaItemToEntity(item: MediaItem): CulturalEntity {
  const period = item.period || yearToPeriod(item.year) || undefined;

  const metadata: CulturalEntityMetadata = {
    medium: item.medium,
    dimensions: item.dimensions,
    collection: item.collection,
    institution: item.collection,
    accessionNumber: item.accessionNumber,
    creditLine: item.creditLine,
    tags: item.tags,
    culture: item.culture,
    period: period,
    country: item.country,
    region: item.region,
  };

  return {
    id: `media:${item.id || item.url}`,
    type: item.type === "book" ? "book" : "artwork",
    name: item.title,
    description: item.description,
    date: item.year,
    source: {
      provider: item.source || "unknown",
      nativeId: item.id || item.url,
      url: item.sourceUrl || item.detailUrl,
      rights: item.rightsLabel,
    },
    metadata,
    imageUrl: item.url,
    sourceUrl: item.sourceUrl || item.detailUrl,
  };
}

// ─── Relationship Finding ───────────────────────────────────────────────────

/**
 * Find cultural relationships between two entities using metadata matching.
 * Returns an array of relationships found, ordered by confidence.
 */
export function findRelationships(
  source: CulturalEntity,
  target: CulturalEntity,
): CulturalRelationship[] {
  const relationships: CulturalRelationship[] = [];

  // 1. Same period match (source_fact if both have explicit period)
  if (source.metadata.period && target.metadata.period) {
    if (
      normalizeText(source.metadata.period) ===
      normalizeText(target.metadata.period)
    ) {
      relationships.push({
        sourceId: source.id,
        targetId: target.id,
        type: "SAME_PERIOD",
        confidence: "source_fact",
        reason: `Both from the ${source.metadata.period} period`,
      });
    }
  }

  // 2. Year-based period match (derived)
  if (relationships.length === 0 && source.date && target.date) {
    const sourcePeriod = yearToPeriod(source.date);
    const targetPeriod = yearToPeriod(target.date);
    if (sourcePeriod && targetPeriod && sourcePeriod === targetPeriod) {
      relationships.push({
        sourceId: source.id,
        targetId: target.id,
        type: "SAME_PERIOD",
        confidence: "derived",
        reason: `Both from the ${sourcePeriod} era`,
      });
    }
  }

  // 3. Same culture match
  if (source.metadata.culture && target.metadata.culture) {
    if (
      normalizeText(source.metadata.culture) ===
      normalizeText(target.metadata.culture)
    ) {
      relationships.push({
        sourceId: source.id,
        targetId: target.id,
        type: "SAME_CULTURE",
        confidence: "source_fact",
        reason: `Both from ${source.metadata.culture} culture`,
      });
    }
  }

  // 4. Same region/place match
  const sourceRegion = source.metadata.region || source.metadata.country;
  const targetRegion = target.metadata.region || target.metadata.country;
  if (sourceRegion && targetRegion) {
    if (normalizeText(sourceRegion) === normalizeText(targetRegion)) {
      relationships.push({
        sourceId: source.id,
        targetId: target.id,
        type: "SAME_PLACE",
        confidence: "source_fact",
        reason: `Both from ${sourceRegion}`,
      });
    }
  }

  // 5. Tag/subject overlap (derived)
  const sourceTags = tokenizeArray([
    ...(source.metadata.tags || []),
    ...(source.metadata.subjects || []),
    ...(source.metadata.genres || []),
  ]);
  const targetTags = tokenizeArray([
    ...(target.metadata.tags || []),
    ...(target.metadata.subjects || []),
    ...(target.metadata.genres || []),
  ]);

  const overlappingTags: string[] = [];
  for (const tag of sourceTags) {
    if (targetTags.has(tag)) {
      overlappingTags.push(tag);
    }
  }

  if (overlappingTags.length >= 2) {
    relationships.push({
      sourceId: source.id,
      targetId: target.id,
      type: "RELATED_TO",
      confidence: "derived",
      reason: `Shared themes: ${overlappingTags.slice(0, 4).join(", ")}`,
    });
  } else if (overlappingTags.length === 1) {
    relationships.push({
      sourceId: source.id,
      targetId: target.id,
      type: "CONNECTED_TO",
      confidence: "derived",
      reason: `Connected through ${overlappingTags[0]}`,
    });
  }

  // 6. Medium-to-subject thematic connections (curated knowledge)
  const mediumConnection = findMediumSubjectConnection(source, target);
  if (mediumConnection) {
    relationships.push(mediumConnection);
  }

  return relationships;
}

/**
 * Curated medium ↔ subject connections.
 * Maps artwork mediums to themes that books often explore.
 * This is curated knowledge, not AI-generated.
 */
function findMediumSubjectConnection(
  a: CulturalEntity,
  b: CulturalEntity,
): CulturalRelationship | null {
  const THEMATIC_BRIDGES: Array<{
    mediumPattern: RegExp;
    subjectPatterns: RegExp[];
    label: string;
  }> = [
    {
      mediumPattern: /manuscript|scroll|calligraph/i,
      subjectPatterns: [/religio|spirit|prayer|sacred|holy|bible|quran|veda/i],
      label: "Religious manuscripts and sacred texts",
    },
    {
      mediumPattern: /portrait|miniature/i,
      subjectPatterns: [
        /nobility|royal|king|queen|court|aristocrat|victorian/i,
      ],
      label: "Portraiture and social history",
    },
    {
      mediumPattern: /landscape|seascape|marin/i,
      subjectPatterns: [/voyage|sea|ocean|explor|travel|adventure|island/i],
      label: "Landscapes and travel literature",
    },
    {
      mediumPattern: /battl|war|military/i,
      subjectPatterns: [/war|battl|soldier|military|campaign|conquest/i],
      label: "War art and military history",
    },
    {
      mediumPattern: /mytholog|religi|sacred|icon/i,
      subjectPatterns: [/myth|leg|fairy|folk|saga|hero|godd/i],
      label: "Mythology in art and literature",
    },
    {
      mediumPattern: /still.life|floral|botan/i,
      subjectPatterns: [/nature|garden|botan|flora|country/i],
      label: "Nature in art and writing",
    },
    {
      mediumPattern: /city|urban|architect|building/i,
      subjectPatterns: [/city|urban|london|paris|rome|street|build/i],
      label: "Urban life in art and literature",
    },
  ];

  const medium = [a.metadata.medium, b.metadata.medium].filter(Boolean).join(" ");
  const subjects = [
    ...(a.metadata.tags || []),
    ...(a.metadata.subjects || []),
    ...(b.metadata.tags || []),
    ...(b.metadata.subjects || []),
  ].join(" ");

  for (const bridge of THEMATIC_BRIDGES) {
    if (
      bridge.mediumPattern.test(medium) &&
      bridge.subjectPatterns.some((p) => p.test(subjects))
    ) {
      const [entityA, entityB] = [a, b];
      return {
        sourceId: entityA.id,
        targetId: entityB.id,
        type: "RELATED_TO",
        confidence: "curated",
        reason: bridge.label,
      };
    }
  }

  return null;
}

// ─── World Resolution ───────────────────────────────────────────────────────

/**
 * Given a primary entity and a pool of candidate entities,
 * resolve the "World Around This" — a structured view of cultural connections.
 */
export function resolveCulturalWorld(
  primary: CulturalEntity,
  candidates: CulturalEntity[],
  maxPerConnection = 6,
): CulturalWorld {
  // Find all relationships from primary to candidates
  const allRelationships: Array<{
    target: CulturalEntity;
    relationship: CulturalRelationship;
  }> = [];

  for (const candidate of candidates) {
    if (candidate.id === primary.id) continue;

    const relationships = findRelationships(primary, candidate);
    for (const rel of relationships) {
      allRelationships.push({ target: candidate, relationship: rel });
    }
  }

  // Group by relationship type
  const grouped = new Map<
    string,
    { relationshipType: RelationshipType; entities: CulturalEntity[]; confidence: string }
  >();

  for (const { target, relationship } of allRelationships) {
    const key = relationship.type;
    const existing = grouped.get(key);
    if (existing) {
      // Deduplicate entities
      if (!existing.entities.some((e) => e.id === target.id)) {
        existing.entities.push(target);
      }
    } else {
      grouped.set(key, {
        relationshipType: relationship.type,
        entities: [target],
        confidence: relationship.confidence,
      });
    }
  }

  // Build connection list with human-readable labels
  const LABELS: Record<string, string> = {
    SAME_PERIOD: "From the same era",
    SAME_CULTURE: "From the same culture",
    SAME_PLACE: "From the same place",
    RELATED_TO: "Thematic connections",
    CONNECTED_TO: "Cultural connections",
    INSPIRED_BY: "Inspired by",
    REFERENCES: "References",
    DEPICTS: "Depicts",
    CREATED_BY: "Created by",
    WRITTEN_BY: "Written by",
    FROM_PERIOD: "From this period",
    LOCATED_IN: "Located in",
    ABOUT: "About",
    PART_OF: "Part of",
    SAME_AS: "Same as",
    INFLUENCED_BY: "Influenced by",
  };

  const connections: CulturalWorldConnection[] = [];

  // Priority order: strongest connections first
  const connectionOrder = [
    "SAME_PERIOD",
    "SAME_CULTURE",
    "SAME_PLACE",
    "RELATED_TO",
    "CONNECTED_TO",
    "INSPIRED_BY",
    "REFERENCES",
  ];

  // Add in priority order first
  for (const type of connectionOrder) {
    const group = grouped.get(type);
    if (group) {
      connections.push({
        relationshipType: group.relationshipType,
        label: LABELS[type] || type,
        entities: group.entities.slice(0, maxPerConnection),
        confidence: group.confidence as any,
      });
      grouped.delete(type);
    }
  }

  // Add any remaining
  for (const [, group] of grouped) {
    if (connections.some((c) => c.label === LABELS[group.relationshipType])) continue;
    connections.push({
      relationshipType: group.relationshipType,
      label: LABELS[group.relationshipType] || group.relationshipType,
      entities: group.entities.slice(0, maxPerConnection),
      confidence: group.confidence as any,
    });
  }

  return { primary, connections };
}
