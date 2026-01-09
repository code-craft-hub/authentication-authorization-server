// src/module/job-recommendation/repositories/job-recommendation.repository.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { JobPost, RecommendationFilters, UserProfile } from "../../../types";

/**
 * Repository layer for job recommendations
 * Handles all database operations with optimized queries
 * 
 * @class JobRecommendationRepository
 */
export class JobRecommendationRepository {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.db = drizzle(pool);
  }

  /**
   * Multi-strategy job search with personalization
   * Excludes jobs the user has already viewed/interacted with
   * 
   * @param jobTitle - User's target job title
   * @param skills - User's skills array
   * @param userId - Optional user ID for personalization
   * @param filters - Additional filters
   * @param excludeViewed - Whether to exclude already viewed jobs
   * @param limit - Maximum results to return
   */
  async findRelevantJobs(
    jobTitle: string,
    skills: string[],
    userId?: string,
    filters?: RecommendationFilters,
    excludeViewed: boolean = true,
    limit: number = 50
  ): Promise<JobPost[]> {
    const normalizedTitle = this.normalizeText(jobTitle);
    const normalizedSkills = skills.map((s) => this.normalizeText(s));
    const searchTerms = [normalizedTitle, ...normalizedSkills].join(" OR ");
    
    const skillPattern = normalizedSkills
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    // Build WHERE clauses for filters
    const filterConditions: any[] = [];
    
    if (filters?.locations && filters.locations.length > 0) {
      filterConditions.push(
        sql`(${sql.join(
          filters.locations.map(loc => 
            sql`LOWER(jp.location) LIKE ${`%${loc.toLowerCase()}%`}`
          ),
          sql` OR `
        )})`
      );
    }

    if (filters?.employmentTypes && filters.employmentTypes.length > 0) {
      filterConditions.push(
        sql`jp.employment_type = ANY(${sql`ARRAY[${sql.join(
          filters.employmentTypes.map(t => sql`${t}`),
          sql`, `
        )}]::text[]`})`
      );
    }

    if (filters?.postedWithinDays) {
      filterConditions.push(
        sql`jp.posted_at >= CURRENT_DATE - INTERVAL '${sql.raw(filters.postedWithinDays.toString())} days'`
      );
    }

    if (filters?.excludeCompanies && filters.excludeCompanies.length > 0) {
      filterConditions.push(
        sql`jp.company_name NOT IN (${sql.join(
          filters.excludeCompanies.map(c => sql`${c}`),
          sql`, `
        )})`
      );
    }

    // Subquery to get viewed/interacted job IDs for this user
    const viewedJobsSubquery = userId && excludeViewed
      ? sql`
        SELECT DISTINCT job_id 
        FROM job_interactions 
        WHERE user_id = ${userId}
          AND interaction_type IN ('viewed', 'dismissed', 'clicked_apply')
          AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      `
      : null;

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
          
          -- Exact skill match count
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
          ) as fuzzy_skill_matches,
          
          -- User interaction history (if userId provided)
          ${userId ? sql`
            COALESCE(
              (
                SELECT COUNT(*)::int 
                FROM job_interactions ji 
                WHERE ji.job_id = jp.id 
                  AND ji.user_id = ${userId}
                  AND ji.interaction_type = 'saved'
              ), 
              0
            ) as user_saved_count,
            COALESCE(
              (
                SELECT COUNT(*)::int 
                FROM job_interactions ji 
                WHERE ji.job_id = jp.id 
                  AND ji.user_id = ${userId}
              ), 
              0
            ) as user_interaction_count
          ` : sql`
            0 as user_saved_count,
            0 as user_interaction_count
          `}
          
        FROM job_posts jp
        WHERE 
          -- Job must not be expired
          (jp.expire_at IS NULL OR jp.expire_at > CURRENT_DATE)
          
          -- Exclude viewed jobs if requested
          ${viewedJobsSubquery ? sql`
            AND jp.id NOT IN (${viewedJobsSubquery})
          ` : sql``}
          
          -- Match criteria
          AND (
            fts @@ websearch_to_tsquery('english', ${searchTerms})
            OR similarity(LOWER(jp.title), ${normalizedTitle.toLowerCase()}) > 0.15
            OR (${skillPattern !== "" ? sql`LOWER(jp.description_text) ~ ${skillPattern}` : sql`FALSE`})
          )
          
          -- Apply additional filters
          ${filterConditions.length > 0 ? sql`
            AND ${sql.join(filterConditions, sql` AND `)}
          ` : sql``}
      )
      SELECT 
        *,
        -- Composite relevance score with personalization
        (
          -- FTS score (normalize to 30 points)
          LEAST(fts_score * 30, 30) +
          
          -- Title similarity (normalize to 25 points)
          (title_similarity * 25) +
          
          -- Exact skill matches (up to 30 points)
          LEAST(exact_skill_matches * 10, 30) +
          
          -- Fuzzy skill matches (up to 10 points)
          LEAST(fuzzy_skill_matches * 2, 10) +
          
          -- Recency bonus (up to 5 points)
          CASE 
            WHEN posted_at >= CURRENT_DATE - INTERVAL '7 days' THEN 5
            WHEN posted_at >= CURRENT_DATE - INTERVAL '14 days' THEN 3
            WHEN posted_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1
            ELSE 0
          END +
          
          -- Personalization boost (if user has saved similar jobs)
          CASE 
            WHEN user_saved_count > 0 THEN 5
            ELSE 0
          END
        ) as relevance_score
      FROM skill_matches
      WHERE 
        (fts_score > 0.001 OR title_similarity > 0.15 OR exact_skill_matches > 0)
      ORDER BY relevance_score DESC, posted_at DESC
      LIMIT ${limit}
    `);

    return result.rows as JobPost[];
  }

  /**
   * Get count of NEW jobs (not yet viewed) for a user
   */
  async getNewJobsCount(
    jobTitle: string,
    skills: string[],
    userId: string,
    filters?: RecommendationFilters
  ): Promise<number> {
    const normalizedTitle = this.normalizeText(jobTitle);
    const normalizedSkills = skills.map((s) => this.normalizeText(s));
    const searchTerms = [normalizedTitle, ...normalizedSkills].join(" OR ");
    
    const result = await this.db.execute<{ count: string }>(sql`
      SELECT COUNT(DISTINCT jp.id)::text as count
      FROM job_posts jp
      WHERE 
        (jp.expire_at IS NULL OR jp.expire_at > CURRENT_DATE)
        AND jp.id NOT IN (
          SELECT DISTINCT job_id 
          FROM job_interactions 
          WHERE user_id = ${userId}
            AND created_at >= CURRENT_DATE - INTERVAL '90 days'
        )
        AND (
          fts @@ websearch_to_tsquery('english', ${searchTerms})
          OR similarity(LOWER(jp.title), ${normalizedTitle.toLowerCase()}) > 0.15
        )
    `);

    return parseInt(result.rows[0]?.count || "0", 10);
  }

  /**
   * Track job interaction (view, save, dismiss, etc.)
   */
  async trackInteraction(
    userId: string,
    jobId: string,
    interactionType: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO job_interactions (
        user_id, job_id, interaction_type, session_id, metadata
      ) VALUES (
        ${userId}, ${jobId}::uuid, ${interactionType}, ${sessionId || null}, ${metadata ? sql`${JSON.stringify(metadata)}::jsonb` : null}
      )
    `);
  }

  /**
   * Get user's interaction history for specific jobs
   */
  async getUserJobInteractions(
    userId: string,
    jobIds: string[]
  ): Promise<Map<string, { isViewed: boolean; isSaved: boolean; count: number }>> {
    if (jobIds.length === 0) return new Map();

    const result = await this.db.execute<{
      job_id: string;
      is_viewed: boolean;
      is_saved: boolean;
      interaction_count: string;
    }>(sql`
      SELECT 
        job_id,
        BOOL_OR(interaction_type IN ('viewed', 'clicked_apply')) as is_viewed,
        BOOL_OR(interaction_type = 'saved') as is_saved,
        COUNT(*)::text as interaction_count
      FROM job_interactions
      WHERE user_id = ${userId}
        AND job_id = ANY(${sql`ARRAY[${sql.join(
          jobIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]`})
      GROUP BY job_id
    `);

    const map = new Map();
    result.rows.forEach((row) => {
      map.set(row.job_id, {
        isViewed: row.is_viewed,
        isSaved: row.is_saved,
        count: parseInt(row.interaction_count, 10),
      });
    });

    return map;
  }

  /**
   * Save search query for analytics
   */
  async saveSearchQuery(
    userId: string | undefined,
    sessionId: string,
    jobTitle: string,
    skills: string[],
    filters: RecommendationFilters | undefined,
    resultsCount: number,
    resultsShown: number
  ): Promise<string> {
    const result = await this.db.execute<{ id: string }>(sql`
      INSERT INTO search_queries (
        user_id, session_id, job_title, skills, filters, results_count, results_shown
      ) VALUES (
        ${userId || null}, 
        ${sessionId}, 
        ${jobTitle}, 
        ${JSON.stringify(skills)}::jsonb, 
        ${filters ? sql`${JSON.stringify(filters)}::jsonb` : null},
        ${resultsCount},
        ${resultsShown}
      )
      RETURNING id
    `);

    return result.rows[0]?.id || "";
  }

  /**
   * Get or create user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await this.db.execute<UserProfile>(sql`
      SELECT * FROM user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  /**
   * Update user profile
   */
  async upsertUserProfile(profile: Partial<UserProfile> & { userId: string }): Promise<void> {
    await this.db.execute(sql`
      INSERT INTO user_profiles (
        user_id, 
        current_job_title, 
        desired_job_title, 
        skills, 
        experience_level,
        preferred_locations,
        preferred_employment_types,
        salary_expectation,
        excluded_companies,
        preferences,
        updated_at
      ) VALUES (
        ${profile.userId},
        ${profile.currentJobTitle || null},
        ${profile.desiredJobTitle || null},
        ${profile.skills ? sql`${JSON.stringify(profile.skills)}::jsonb` : null},
        ${profile.experienceLevel || null},
        ${profile.preferredLocations ? sql`${JSON.stringify(profile.preferredLocations)}::jsonb` : null},
        ${profile.preferredEmploymentTypes ? sql`${JSON.stringify(profile.preferredEmploymentTypes)}::jsonb` : null},
        ${profile.salaryExpectation ? sql`${JSON.stringify(profile.salaryExpectation)}::jsonb` : null},
        ${profile.excludedCompanies ? sql`${JSON.stringify(profile.excludedCompanies)}::jsonb` : null},
        ${profile.preferences ? sql`${JSON.stringify(profile.preferences)}::jsonb` : null},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        current_job_title = COALESCE(EXCLUDED.current_job_title, user_profiles.current_job_title),
        desired_job_title = COALESCE(EXCLUDED.desired_job_title, user_profiles.desired_job_title),
        skills = COALESCE(EXCLUDED.skills, user_profiles.skills),
        experience_level = COALESCE(EXCLUDED.experience_level, user_profiles.experience_level),
        preferred_locations = COALESCE(EXCLUDED.preferred_locations, user_profiles.preferred_locations),
        preferred_employment_types = COALESCE(EXCLUDED.preferred_employment_types, user_profiles.preferred_employment_types),
        salary_expectation = COALESCE(EXCLUDED.salary_expectation, user_profiles.salary_expectation),
        excluded_companies = COALESCE(EXCLUDED.excluded_companies, user_profiles.excluded_companies),
        preferences = COALESCE(EXCLUDED.preferences, user_profiles.preferences),
        updated_at = NOW()
    `);
  }

  /**
   * Get user's engagement metrics for personalization
   */
  async getUserEngagementMetrics(userId: string): Promise<{
    topSkills: string[];
    preferredCompanies: string[];
    avgInteractionTime: number;
  }> {
    const result = await this.db.execute<{
      top_skills: string;
      preferred_companies: string;
      avg_time: string;
    }>(sql`
      WITH user_searches AS (
        SELECT 
          jsonb_array_elements_text(skills) as skill
        FROM search_queries
        WHERE user_id = ${userId}
          AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      ),
      user_viewed_companies AS (
        SELECT 
          jp.company_name,
          COUNT(*) as view_count
        FROM job_interactions ji
        JOIN job_posts jp ON ji.job_id = jp.id
        WHERE ji.user_id = ${userId}
          AND ji.interaction_type IN ('viewed', 'saved')
          AND ji.created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY jp.company_name
        ORDER BY view_count DESC
        LIMIT 10
      )
      SELECT 
        COALESCE(
          (
            SELECT json_agg(skill ORDER BY skill_count DESC)::text
            FROM (
              SELECT skill, COUNT(*) as skill_count
              FROM user_searches
              GROUP BY skill
              ORDER BY skill_count DESC
              LIMIT 10
            ) s
          ),
          '[]'
        ) as top_skills,
        COALESCE(
          (SELECT json_agg(company_name)::text FROM user_viewed_companies),
          '[]'
        ) as preferred_companies,
        COALESCE(
          (
            SELECT AVG((metadata->>'timeSpent')::numeric)::text
            FROM job_interactions
            WHERE user_id = ${userId}
              AND metadata->>'timeSpent' IS NOT NULL
              AND created_at >= CURRENT_DATE - INTERVAL '90 days'
          ),
          '0'
        ) as avg_time
    `);

    const row = result.rows[0];
    return {
      topSkills: row?.top_skills ? JSON.parse(row.top_skills) : [],
      preferredCompanies: row?.preferred_companies ? JSON.parse(row.preferred_companies) : [],
      avgInteractionTime: parseFloat(row?.avg_time || "0"),
    };
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
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}