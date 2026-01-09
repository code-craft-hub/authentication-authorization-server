-- Job Recommendation Engine Database Schema
-- Version: 3.0
-- Description: Creates all necessary tables, indexes, and extensions for the job recommendation system

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For trigram similarity matching
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For multi-column GIN indexes

-- ============================================
-- Core Tables
-- ============================================

-- Job posts table (existing, no changes needed)
-- Already defined in schema.ts

-- ============================================
-- NEW: User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    current_job_title TEXT,
    desired_job_title TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    experience_level TEXT,
    preferred_locations JSONB DEFAULT '[]'::jsonb,
    preferred_employment_types JSONB DEFAULT '[]'::jsonb,
    salary_expectation JSONB,
    excluded_companies JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active);
CREATE INDEX idx_user_profiles_skills ON user_profiles USING GIN (skills);

-- ============================================
-- NEW: Job Interactions Table
-- ============================================
CREATE TABLE IF NOT EXISTS job_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    job_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- 'viewed', 'saved', 'dismissed', 'clicked_apply', 'shared', 'reported'
    session_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_interactions_user_id ON job_interactions(user_id);
CREATE INDEX idx_job_interactions_job_id ON job_interactions(job_id);
CREATE INDEX idx_job_interactions_type ON job_interactions(interaction_type);
CREATE INDEX idx_job_interactions_created_at ON job_interactions(created_at);
CREATE INDEX idx_job_interactions_session ON job_interactions(session_id);
CREATE INDEX idx_job_interactions_user_job ON job_interactions(user_id, job_id);

-- ============================================
-- NEW: Search Queries Table
-- ============================================
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    session_id TEXT,
    job_title TEXT NOT NULL,
    skills JSONB NOT NULL,
    filters JSONB,
    results_count INTEGER DEFAULT 0,
    results_shown INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX idx_search_queries_session ON search_queries(session_id);

-- ============================================
-- NEW: Recommendation Feedback Table
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    job_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL, -- 'thumbs_up', 'thumbs_down', 'not_relevant', etc.
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id, feedback_type)
);

CREATE INDEX idx_recommendation_feedback_user ON recommendation_feedback(user_id);
CREATE INDEX idx_recommendation_feedback_job ON recommendation_feedback(job_id);

-- ============================================
-- Generated Content Table (for resumes/cover letters)
-- ============================================
CREATE TABLE IF NOT EXISTS generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_content_user ON generated_content(user_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);

-- ============================================
-- Update existing job_recommendations table
-- ============================================
ALTER TABLE job_recommendations 
    ADD COLUMN IF NOT EXISTS match_score NUMERIC(5, 2),
    ALTER COLUMN match_score DROP DEFAULT;

-- Add unique constraint to prevent duplicate recommendations
ALTER TABLE job_recommendations 
    ADD CONSTRAINT job_recommendations_user_job_unique 
    UNIQUE (user_id, job_id);

-- ============================================
-- Triggers for automatic timestamp updates
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Cleanup function for old interactions
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_interactions()
RETURNS void AS $$
BEGIN
    -- Delete interactions older than 180 days
    DELETE FROM job_interactions
    WHERE created_at < NOW() - INTERVAL '180 days';
    
    -- Delete search queries older than 90 days
    DELETE FROM search_queries
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Analytics Views
-- ============================================

-- User engagement summary view
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT 
    user_id,
    COUNT(DISTINCT CASE WHEN interaction_type = 'viewed' THEN job_id END) as total_views,
    COUNT(DISTINCT CASE WHEN interaction_type = 'saved' THEN job_id END) as total_saves,
    COUNT(DISTINCT CASE WHEN interaction_type = 'clicked_apply' THEN job_id END) as total_applies,
    COUNT(DISTINCT CASE WHEN interaction_type = 'dismissed' THEN job_id END) as total_dismissals,
    AVG(CASE 
        WHEN metadata->>'timeSpent' IS NOT NULL 
        THEN (metadata->>'timeSpent')::numeric 
        ELSE NULL 
    END) as avg_time_spent_seconds,
    MAX(created_at) as last_interaction
FROM job_interactions
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY user_id;

-- Popular jobs view (for trending/hot jobs feature)
CREATE OR REPLACE VIEW popular_jobs AS
SELECT 
    jp.id,
    jp.title,
    jp.company_name,
    jp.location,
    COUNT(DISTINCT ji.user_id) as unique_viewers,
    COUNT(CASE WHEN ji.interaction_type = 'saved' THEN 1 END) as save_count,
    COUNT(CASE WHEN ji.interaction_type = 'clicked_apply' THEN 1 END) as apply_count,
    AVG(CASE 
        WHEN ji.metadata->>'timeSpent' IS NOT NULL 
        THEN (ji.metadata->>'timeSpent')::numeric 
        ELSE NULL 
    END) as avg_engagement_time
FROM job_posts jp
LEFT JOIN job_interactions ji ON jp.id = ji.job_id
WHERE jp.expire_at IS NULL OR jp.expire_at > CURRENT_DATE
    AND jp.posted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY jp.id, jp.title, jp.company_name, jp.location
HAVING COUNT(DISTINCT ji.user_id) > 5
ORDER BY unique_viewers DESC, save_count DESC;

-- ============================================
-- Sample Data (for development/testing)
-- ============================================
-- Uncomment to insert sample data

/*
INSERT INTO user_profiles (user_id, desired_job_title, skills, experience_level)
VALUES 
    ('user123', 'Senior Software Engineer', '["JavaScript", "React", "Node.js", "PostgreSQL"]'::jsonb, 'senior'),
    ('user456', 'Data Scientist', '["Python", "Machine Learning", "TensorFlow", "SQL"]'::jsonb, 'mid');
*/

-- ============================================
-- Performance optimization notes
-- ============================================
-- 1. For production, consider partitioning job_interactions by created_at
-- 2. Regularly run VACUUM ANALYZE on high-traffic tables
-- 3. Monitor index usage with pg_stat_user_indexes
-- 4. Consider materialized views for expensive aggregations
-- 5. Set up connection pooling (already configured in app.ts)

COMMENT ON TABLE user_profiles IS 'Stores user preferences and profile information for personalization';
COMMENT ON TABLE job_interactions IS 'Tracks all user interactions with job posts (views, saves, applies, etc.)';
COMMENT ON TABLE search_queries IS 'Logs search queries for analytics and personalization improvement';
COMMENT ON TABLE recommendation_feedback IS 'Explicit user feedback on job recommendations for ML training';