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


  // 7. Same creator / artist match
  if (source.metadata.authors && target.metadata.authors) {
    const sourceCreators = extractTokens(source.metadata.authors);
    const targetCreators = extractTokens(target.metadata.authors);
    for (const creator of sourceCreators) {
      if (targetCreators.has(creator) && creator.length > 3) {
        relationships.push({
          sourceId: source.id,
          targetId: target.id,
          type: "CREATED_BY",
          confidence: "source_fact",
          reason: `Both connected to ${source.metadata.authors.split(",")[0].trim()}`,
        });
        break;
      }
    }
  }

  // 8. Same style / movement match
  const sourceStyle = source.metadata.style || source.metadata.period || "";
  const targetStyle = target.metadata.style || target.metadata.period || "";
  if (sourceStyle && targetStyle && sourceStyle !== targetStyle) {
    if (normalizeText(sourceStyle) === normalizeText(targetStyle)) {
      // Avoid duplicate if SAME_PERIOD already found
      const hasPeriod = relationships.some(r => r.type === "SAME_PERIOD");
      if (!hasPeriod) {
        relationships.push({
          sourceId: source.id,
          targetId: target.id,
          type: "INFLUENCED_BY",
          confidence: "derived",
          reason: `Both part of the ${sourceStyle} movement`,
        });
      }
    }
  }

  // 9. Classification / genre overlap (artwork classification to book genre)
  const sourceClass = tokenizeArray([source.metadata.classification || ""]);
  const targetGenres = tokenizeArray([...(target.metadata.genres || []), ...(target.metadata.subjects || [])]);
  if (sourceClass.size > 0 && targetGenres.size > 0) {
    const classOverlap: string[] = [];
    for (const c of sourceClass) {
      if (targetGenres.has(c)) classOverlap.push(c);
    }
    if (classOverlap.length > 0) {
      const alreadyCovered = relationships.some(r =>
        r.type === "RELATED_TO" || r.type === "CONNECTED_TO"
      );
      if (!alreadyCovered) {
        relationships.push({
          sourceId: source.id,
          targetId: target.id,
          type: "ABOUT",
          confidence: "derived",
          reason: `Explores themes of ${classOverlap.slice(0, 3).join(", ")}`,
        });
      }
    }
  }

  // 10. Medium-to-subject thematic connections (curated knowledge)
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
    {
      mediumPattern: /nude|figure|bod/i,
      subjectPatterns: [/love|romance|beauty|desire|sensu|erotic|intim/i],
      label: "The human form in art and love poetry",
    },
    {
      mediumPattern: /flower|garden|ros|lily|tulip/i,
      subjectPatterns: [/love|beauty|spring|death|passage|time|mortal/i],
      label: "Flowers as symbols of beauty and mortality",
    },
    {
      mediumPattern: /cross|crucifix|religious|altarpiece|madonna/i,
      subjectPatterns: [/faith|soul|pray|redempt|sin|grace|divine|christ/i],
      label: "Sacred art and devotional literature",
    },
    {
      mediumPattern: /map|chart|navig|compass/i,
      subjectPatterns: [/voyage|explor|discover|travel|sea|journey|world/i],
      label: "Cartography and exploration narratives",
    },
    {
      mediumPattern: /mask|ceremoni|ritual|totem/i,
      subjectPatterns: [/ritual|ceremoni|folk|tradition|spirit|ancestor|tribe/i],
      label: "Ritual objects and cultural traditions",
    },
    {
      mediumPattern: /animal|horse|dog|bird|wild/i,
      subjectPatterns: [/nature|hunt|animal|beast|fable|wild|forest/i],
      label: "Animals in art and fable",
    },
    {
      mediumPattern: /music|instrument|lyre|lute|harp/i,
      subjectPatterns: [/music|song|poet|lyric|ballad|sing|melod/i],
      label: "Music and poetic expression",
    },
    {
      mediumPattern: /tomb|funer|burial|mummy|sarcophagus/i,
      subjectPatterns: [/death|mortal|afterlife|underworld|grief|loss|eternit/i],
      label: "Death, burial, and the afterlife",
    },
    {
      mediumPattern: /sword|armor|shield|helmet/i,
      subjectPatterns: [/war|hero|battle|knight|chival|conquest|glory/i],
      label: "Arms and the heroic tradition",
    },
    {
      mediumPattern: /vase|pottery|ceramic|amphora/i,
      subjectPatterns: [/daily.life|domestic|trade|craft|merchant|food|wine/i],
      label: "Everyday objects and domestic life",
    },
    {
      mediumPattern: /self.portrait|portrait.*self/i,
      subjectPatterns: [/identity|self|ego|memoir|autobio|confess/i],
      label: "Self-representation and personal narrative",
    },
    {
      mediumPattern: /abstract|geometric|non.representational/i,
      subjectPatterns: [/mind|conscious|percept|dream|surreal|psycho|abstract/i],
      label: "Abstraction in art and thought",
    },
    {
      mediumPattern: /sunset|sunrise|twilight|dawn|dusk|night|moon/i,
      subjectPatterns: [/night|dark|dream|sleep|moon|star|shadow|melanchol/i],
      label: "Light and shadow in art and poetry",
    },
    {
      mediumPattern: /fountain|river|stream|water|sea|ocean|wave/i,
      subjectPatterns: [/water|sea|river|ocean|fish|sail|wave|current/i],
      label: "Water as subject and metaphor",
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
    SAME_PERIOD: "Born of the same era",
    SAME_CULTURE: "Shared cultural roots",
    SAME_PLACE: "Connected by place",
    RELATED_TO: "Thematic echoes",
    CONNECTED_TO: "Cultural threads",
    INSPIRED_BY: "Inspired by",
    REFERENCES: "References & allusions",
    DEPICTS: "Depicts",
    CREATED_BY: "Shared creator",
    WRITTEN_BY: "Written by",
    FROM_PERIOD: "From this period",
    LOCATED_IN: "Located in",
    ABOUT: "Explores similar themes",
    PART_OF: "Part of",
    SAME_AS: "Same as",
    INFLUENCED_BY: "Part of the same movement",
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
