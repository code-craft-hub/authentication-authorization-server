import "dotenv/config";
import { Pool } from "pg";

export class JobRecommendationRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Multi-strategy job search using PostgreSQL full-text search,
   * trigram similarity, and vector-like scoring
   */
  async findRelevantJobs(
    jobTitle: string,
    skills: string[],
    limit: number = 50
  ): Promise<any[]> {
    // Normalize inputs
    const normalizedTitle = this.normalizeText(jobTitle);
    const normalizedSkills = skills.map((s) => this.normalizeText(s));

    // Create search query combining title and skills
    const searchTerms = [normalizedTitle, ...normalizedSkills].join(" OR ");

    // Build skill pattern for regex matching (case-insensitive)
    const skillPattern = normalizedSkills
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const query = `
      WITH skill_matches AS (
        SELECT 
          jp.*,
          -- Full-text search ranking (weighted by field importance)
          (
            ts_rank_cd(fts_title, websearch_to_tsquery('english', $1)) * 4.0 +
            ts_rank_cd(fts_description_text, websearch_to_tsquery('english', $2)) * 2.0
          ) as fts_score,
          
          -- Title similarity using trigram
          similarity(LOWER(title), $3) as title_similarity,
          
          -- Exact skill match count
          (
            SELECT COUNT(*)
            FROM unnest($4::text[]) AS skill
            WHERE LOWER(jp.description_text) ~ LOWER(skill)
               OR LOWER(jp.title) ~ LOWER(skill)
               OR LOWER(COALESCE(jp.job_function, '')) ~ LOWER(skill)
          ) as exact_skill_matches,
          
          -- Fuzzy skill match count
          (
            SELECT COUNT(DISTINCT skill)
            FROM unnest($4::text[]) AS skill
            WHERE LOWER(jp.description_text) LIKE '%' || LOWER(skill) || '%'
          ) as fuzzy_skill_matches
          
        FROM job_posts jp
        WHERE 
          -- Job must not be expired
          (jp.expire_at IS NULL OR jp.expire_at > CURRENT_DATE)
          AND (
            -- Match on full-text search
            fts @@ websearch_to_tsquery('english', $2)
            OR
            -- Match on title similarity
            similarity(LOWER(jp.title), $3) > 0.15
            OR
            -- Match on skills in description
            ($5 != '' AND LOWER(jp.description_text) ~ $5)
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
      LIMIT $6;
    `;

    const values = [
      normalizedTitle,
      searchTerms,
      normalizedTitle.toLowerCase(),
      normalizedSkills,
      skillPattern,
      limit
    ];

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Get job details by IDs
   */
  async getJobsByIds(jobIds: string[]): Promise<any[]> {
    if (jobIds.length === 0) return [];

    const query = `
      SELECT * FROM job_posts
      WHERE id = ANY($1::uuid[])
    `;

    const result = await this.pool.query(query, [jobIds]);
    return result.rows;
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
}