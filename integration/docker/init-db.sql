-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Recommendation interaction events table
-- Used by ML service for model retraining feedback loop
CREATE TABLE IF NOT EXISTS recommendation_interactions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL,
    policy_id         TEXT NOT NULL,
    recommendation_id UUID,
    action            TEXT NOT NULL CHECK (action IN ('view','click','quote','purchase','dismiss')),
    session_id        TEXT,
    context           TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_interactions_user_id    ON recommendation_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_action     ON recommendation_interactions(action);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_created_at ON recommendation_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_policy_id  ON recommendation_interactions(policy_id);

-- Partial index for recent interactions (last 30 days) used in retraining
CREATE INDEX IF NOT EXISTS idx_rec_interactions_recent ON recommendation_interactions(created_at)
    WHERE created_at >= NOW() - INTERVAL '30 days';

COMMENT ON TABLE recommendation_interactions IS
  'Stores user interaction events with recommended policies. Fed into ML model retraining pipeline nightly.';
