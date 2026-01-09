import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

interface JobPost extends Record<string, unknown> {
  id: string;
  title: string;
  description_text?: string;
  job_function?: string;
  posted_at?: Date;
  expire_at?: Date;
  relevance_score?: number;
  fts_score?: number;
  title_similarity?: number;
  exact_skill_matches?: number;
  fuzzy_skill_matches?: number;
}

export class JobRecommendationRepository {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.db = drizzle(pool);
  }

  /**
   * Multi-strategy job search using PostgreSQL full-text search,
   * trigram similarity, and vector-like scoring
   */
  async findRelevantJobs(
    jobTitle: string,
    skills: string[],
    limit: number = 50
  ): Promise<JobPost[]> {
    // Normalize inputs
    const normalizedTitle = this.normalizeText(jobTitle);
    const normalizedSkills = skills.map((s) => this.normalizeText(s));

    // Create search query combining title and skills
    const searchTerms = [normalizedTitle, ...normalizedSkills].join(" OR ");

    // Build skill pattern for regex matching (case-insensitive)
    const skillPattern = normalizedSkills
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    // Execute complex query using sql template
    // Note: Drizzle doesn't have direct support for all PostgreSQL features,
    // so we use raw SQL for complex queries like this
    const result = await this.db.execute<JobPost>(sql`
      WITH skill_matches AS (
        SELECT 
          jp.*,
          -- Full-text search ranking (weighted by field importance)
          (
            ts_rank_cd(fts_title, websearch_to_tsquery('english', ${normalizedTitle})) * 4.0 +
            ts_rank_cd(fts_description_text, websearch_to_tsquery('english', ${searchTerms})) * 2.0
          ) as fts_score,
          
          -- Title similarity using trigram
          similarity(LOWER(title), ${normalizedTitle.toLowerCase()}) as title_similarity,
          
          -- Exact skill match count using unnest
          (
            SELECT COUNT(*)
            FROM unnest(${sql`ARRAY[${sql.join(
              normalizedSkills.map((s) => sql`${s}`),
              sql`, `
            )}]::text[]`}) AS skill
            WHERE LOWER(jp.description_text) ~ LOWER(skill)
               OR LOWER(jp.title) ~ LOWER(skill)
               OR LOWER(COALESCE(jp.job_function, '')) ~ LOWER(skill)
          ) as exact_skill_matches,
          
          -- Fuzzy skill match count
          (
            SELECT COUNT(DISTINCT skill)
            FROM unnest(${sql`ARRAY[${sql.join(
              normalizedSkills.map((s) => sql`${s}`),
              sql`, `
            )}]::text[]`}) AS skill
            WHERE LOWER(jp.description_text) LIKE '%' || LOWER(skill) || '%'
          ) as fuzzy_skill_matches
          
        FROM job_posts jp
        WHERE 
          -- Job must not be expired
          (jp.expire_at IS NULL OR jp.expire_at > CURRENT_DATE)
          AND (
            -- Match on full-text search
            fts @@ websearch_to_tsquery('english', ${searchTerms})
            OR
            -- Match on title similarity (requires pg_trgm extension)
            similarity(LOWER(jp.title), ${normalizedTitle.toLowerCase()}) > 0.15
            OR
            -- Match on skills in description
            (${skillPattern !== "" ? sql`LOWER(jp.description_text) ~ ${skillPattern}` : sql`FALSE`})
          )
      )
      SELECT 
        *,
        -- Composite relevance score (normalized 0-100)
        (
          -- FTS score (max ~1.0, normalize to 30 points)
          LEAST(fts_score * 30, 30) +
          
          -- Title similarity (0-1, normalize to 25 points)
          (title_similarity * 25) +
          
          -- Exact skill matches (up to 30 points, 10 per skill up to 3 skills)
          LEAST(exact_skill_matches * 10, 30) +
          
          -- Fuzzy skill matches (up to 10 points, 2 per skill)
          LEAST(fuzzy_skill_matches * 2, 10) +
          
          -- Recency bonus (up to 5 points for jobs posted in last 7 days)
          CASE 
            WHEN posted_at >= CURRENT_DATE - INTERVAL '7 days' THEN 5
            WHEN posted_at >= CURRENT_DATE - INTERVAL '14 days' THEN 3
            WHEN posted_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1
            ELSE 0
          END
        ) as relevance_score
      FROM skill_matches
      WHERE 
        -- Filter out very low scores
        (fts_score > 0.001 OR title_similarity > 0.15 OR exact_skill_matches > 0)
      ORDER BY relevance_score DESC
      LIMIT ${limit}
    `);

    return result.rows as JobPost[];
  }

  /**
   * Get job details by IDs
   * This uses Drizzle's query builder for simpler queries
   */
  async getJobsByIds(jobIds: string[]): Promise<JobPost[]> {
    if (jobIds.length === 0) return [];

    // Using raw SQL for ANY operator since Drizzle's inArray would generate IN clause
    const result = await this.db.execute<JobPost>(sql`
      SELECT * FROM job_posts
      WHERE id = ANY(${sql`ARRAY[${sql.join(
        jobIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )}]`})
    `);

    return result.rows as JobPost[];
  }

  /**
   * Normalize text for consistent matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s+#]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
