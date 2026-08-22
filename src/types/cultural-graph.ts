/**
 * PAGE.OS Cultural Graph — Type System
 *
 * This module defines the normalized entity and relationship model
 * that allows books, artworks, people, places, periods, and themes
 * to exist inside one coherent cultural system.
 *
 * Design principles:
 *  - Every entity has a stable ID and clear provenance
 *  - Relationships carry a confidence level distinguishing
 *    source-derived facts from AI-generated interpretations
 *  - The model is extensible — new entity types and relationships
 *    can be added without breaking existing consumers
 *  - External source data maps INTO this model, never the reverse
 */

// ─── Entity Types ───────────────────────────────────────────────────────────

export type CulturalEntityType =
  | "book"
  | "artwork"
  | "person"
  | "place"
  | "period"
  | "event"
  | "theme"
  | "collection"
  | "medium"
  | "culture"
  | "movement";

/** A normalized cultural entity — the atomic unit of the graph. */
export interface CulturalEntity {
  /** Stable unique identifier. Format: `{source}:{type}:{sourceId}` */
  id: string;
  /** The kind of cultural object. */
  type: CulturalEntityType;
  /** Display name. */
  name: string;
  /** Longer description when available. */
  description?: string;
  /** Entity dates (freeform — "1503", "1889", "1818–1819"). */
  date?: string;
  /** Source provenance. */
  source: CulturalEntitySource;
  /** Flexible key-value metadata from the source. */
  metadata: CulturalEntityMetadata;
  /** URL to a representative image when available. */
  imageUrl?: string;
  /** URL to the source record for provenance. */
  sourceUrl?: string;
}

export interface CulturalEntitySource {
  /** Which external provider or adapter produced this entity. */
  provider: string;
  /** The provider's native ID for this entity. */
  nativeId: string;
  /** URL to the original source record. */
  url?: string;
  /** Rights / license label. */
  rights?: string;
}

/**
 * Structured metadata fields for cultural entities.
 * All fields are optional — sources provide whatever they have.
 * Missing data is explicit, never faked.
 */
export interface CulturalEntityMetadata {
  // Person fields
  fullName?: string;
  familyName?: string;
  birthDate?: string;
  deathDate?: string;
  nationality?: string;
  occupation?: string[];

  // Artwork fields
  medium?: string;
  dimensions?: string;
  collection?: string;
  institution?: string;
  accessionNumber?: string;
  creditLine?: string;

  // Book fields
  authors?: string;
  languages?: string[];
  subjects?: string[];
  genres?: string[];
  firstPublished?: string;
  fileFormats?: string[];

  // Place fields
  country?: string;
  region?: string;
  latitude?: number;
  longitude?: number;

  // Period / Movement / Culture fields
  startYear?: number;
  endYear?: number;
  geographicalScope?: string;

  // Generic
  tags?: string[];
  culture?: string;
  period?: string;
  style?: string;
  classification?: string;
}

// ─── Relationship Types ─────────────────────────────────────────────────────

export type RelationshipType =
  | "CREATED_BY"
  | "WRITTEN_BY"
  | "FROM_PERIOD"
  | "LOCATED_IN"
  | "ABOUT"
  | "RELATED_TO"
  | "INSPIRED_BY"
  | "REFERENCES"
  | "PART_OF"
  | "DEPICTS"
  | "SAME_AS"
  | "CONNECTED_TO"
  | "SAME_PERIOD"
  | "SAME_CULTURE"
  | "SAME_THEME"
  | "SAME_PLACE"
  | "INFLUENCED_BY";

/**
 * Confidence level distinguishes what the system knows
 * from what it infers or generates.
 *
 * This is a core trust model requirement (Vision §49):
 *  - SOURCE_FACT: directly from the source record
 *  - DERIVED: computed from known relationships
 *  - AI_GENERATED: produced by an LLM
 */
export type RelationshipConfidence =
  | "source_fact"
  | "derived"
  | "curated"
  | "ai_generated";

/**
 * A directed, typed connection between two cultural entities.
 * Relationships are the connective tissue of the cultural graph.
 */
export interface CulturalRelationship {
  /** Entity ID of the source (subject). */
  sourceId: string;
  /** Entity ID of the target (object). */
  targetId: string;
  /** The type of relationship. */
  type: RelationshipType;
  /** How confident we are in this relationship. */
  confidence: RelationshipConfidence;
  /** Human-readable explanation of why this relationship exists. */
  reason?: string;
  /** Source provider that established this relationship. */
  sourceProvider?: string;
}

// ─── Aggregated Views ───────────────────────────────────────────────────────

/**
 * A cultural entity with its outgoing and incoming relationships resolved.
 * This is what the presentation layer consumes.
 */
export interface ConnectedEntity {
  entity: CulturalEntity;
  /** Relationships where this entity is the source. */
  outgoing: CulturalRelationship[];
  /** Relationships where this entity is the target. */
  incoming: CulturalRelationship[];
}

/**
 * The "World Around This" — a resolved cultural context panel
 * showing connections between a primary entity and related cultural objects.
 */
export interface CulturalWorld {
  /** The entity the user is currently exploring. */
  primary: CulturalEntity;
  /** Direct connections organized by relationship type. */
  connections: CulturalWorldConnection[];
  /** Summary of the cultural landscape around this entity. */
  summary?: string;
}

export interface CulturalWorldConnection {
  /** The relationship type grouping. */
  relationshipType: RelationshipType;
  /** Human-readable label for this group. */
  label: string;
  /** Connected entities, ordered by relevance. */
  entities: CulturalEntity[];
  /** How these connections were determined. */
  confidence: RelationshipConfidence;
}

// ─── Trail Types ────────────────────────────────────────────────────────────

export type TrailNodeType =
  | "entity"
  | "passage"
  | "context"
  | "reflection";

/**
 * A node in a cultural trail — a step in a journey through culture.
 */
export interface TrailNode {
  id: string;
  type: TrailNodeType;
  /** Reference to a CulturalEntity (for entity nodes). */
  entityId?: string;
  /** Display title for this step. */
  title: string;
  /** Contextual text or reflection. */
  content?: string;
  /** Order index in the trail. */
  order: number;
}

/**
 * A cultural trail — a meaningful sequence of connected discoveries.
 * Trails are the human layer that turns relationships into journeys.
 */
export interface Trail {
  id: string;
  title: string;
  description?: string;
  /** The creator of this trail. */
  authorId?: string;
  authorName?: string;
  /** Ordered sequence of trail nodes. */
  nodes: TrailNode[];
  /** Tags for discovery and organization. */
  tags: string[];
  /** When this trail was created. */
  createdAt: string;
  /** When this trail was last modified. */
  updatedAt: string;
  /** Whether this trail is public. */
  isPublic: boolean;
  /** Number of people who have followed this trail. */
  followerCount?: number;
}

// ─── Library as Cultural Memory ─────────────────────────────────────────────

export type SavedItemType = "book" | "artwork" | "entity" | "trail" | "passage";

/**
 * An enriched saved item — part of the user's personal cultural memory.
 * Goes beyond simple bookmarking to capture why something mattered.
 */
export interface SavedItem {
  id: string;
  /** The type of cultural object saved. */
  itemType: SavedItemType;
  /** Reference to the source entity. */
  entityId?: string;
  /** Source adapter key. */
  source?: string;
  /** Native ID from the source. */
  sourceId?: string;
  /** Display title. */
  title: string;
  /** Creator / author / artist. */
  creator?: string;
  /** URL to a representative image. */
  imageUrl?: string;
  /** URL to the source record. */
  sourceUrl?: string;
  /** When this item was saved. */
  savedAt: string;
  /** The user's personal note: "Why I saved this". */
  note?: string;
  /** Tags the user applied. */
  userTags?: string[];
  /** Reading progress (for books). 0–100. */
  progress?: number;
  /** Collection IDs this item belongs to. */
  collectionIds?: string[];
}

/**
 * A user-created collection that can contain different types
 * of cultural objects.
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  /** IDs of saved items in this collection. */
  itemIds: string[];
  /** When this collection was created. */
  createdAt: string;
  /** When this collection was last modified. */
  updatedAt: string;
  /** Whether this collection is public. */
  isPublic: boolean;
}

// ─── Discovery Modes ────────────────────────────────────────────────────────

/**
 * Identifies which discovery mode produced a recommendation.
 * (Vision §53 — Explainable Discovery)
 */
export type DiscoveryMode =
  | "random"
  | "relationship"
  | "personal"
  | "curated"
  | "contextual"
  | "serendipitous";

/**
 * A discovery suggestion with explanation.
 */
export interface Discovery {
  entity: CulturalEntity;
  /** Which mode produced this discovery. */
  mode: DiscoveryMode;
  /** Human-readable explanation of why this was suggested. */
  explanation: string;
  /** The entity that triggered this discovery (if relationship-based). */
  triggerEntityId?: string;
  /** The relationship that connects them (if applicable). */
  relationship?: CulturalRelationship;
}
