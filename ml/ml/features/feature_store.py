"""
Online feature store backed by Redis.
Retrieves pre-computed user features for real-time inference.
Falls back to computing features on-the-fly when cache misses.
"""

import json
from typing import Dict, Any, Optional, List
from datetime import timedelta
import redis.asyncio as aioredis
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

settings = get_settings()


class FeatureStore:
    """Redis-backed feature store for online inference."""

    USER_FEATURES_KEY  = "feat:user:{user_id}"
    POLICY_FEATURES_KEY = "feat:policy:{policy_id}"
    POLICY_LIST_KEY    = "feat:policy_list:{category}"
    ALL_POLICIES_KEY   = "feat:all_policies"

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            self._redis = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                max_connections=20,
            )
            await self._redis.ping()
            logger.info("Feature store connected to Redis")
        except Exception as e:
            logger.warning(f"Feature store Redis unavailable: {e}. Will use DB fallback.")
            self._redis = None

    async def disconnect(self):
        if self._redis:
            await self._redis.aclose()

    async def is_connected(self) -> bool:
        if not self._redis:
            return False
        try:
            await self._redis.ping()
            return True
        except Exception:
            return False

    # ── User Features ──────────────────────────────────────────────────────

    async def get_user_features(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached user features."""
        if not self._redis:
            return None
        try:
            key = self.USER_FEATURES_KEY.format(user_id=user_id)
            raw = await self._redis.get(key)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Feature store get_user_features error: {e}")
        return None

    async def set_user_features(
        self,
        user_id: str,
        features: Dict[str, Any],
        ttl: int = None,
    ) -> bool:
        """Cache user features."""
        if not self._redis:
            return False
        try:
            key = self.USER_FEATURES_KEY.format(user_id=user_id)
            ttl = ttl or settings.FEATURE_CACHE_TTL
            await self._redis.setex(key, ttl, json.dumps(features))
            return True
        except Exception as e:
            logger.warning(f"Feature store set_user_features error: {e}")
            return False

    async def invalidate_user_features(self, user_id: str) -> bool:
        if not self._redis:
            return False
        try:
            key = self.USER_FEATURES_KEY.format(user_id=user_id)
            await self._redis.delete(key)
            return True
        except Exception:
            return False

    # ── Policy Features ────────────────────────────────────────────────────

    async def get_policy_features(self, policy_id: str) -> Optional[Dict[str, Any]]:
        if not self._redis:
            return None
        try:
            key = self.POLICY_FEATURES_KEY.format(policy_id=policy_id)
            raw = await self._redis.get(key)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Feature store get_policy_features error: {e}")
        return None

    async def set_policy_features(
        self,
        policy_id: str,
        features: Dict[str, Any],
        ttl: int = 3600,
    ) -> bool:
        if not self._redis:
            return False
        try:
            key = self.POLICY_FEATURES_KEY.format(policy_id=policy_id)
            await self._redis.setex(key, ttl, json.dumps(features))
            return True
        except Exception:
            return False

    async def get_all_policies(self) -> Optional[List[Dict[str, Any]]]:
        """Retrieve the full active policy catalog from cache."""
        if not self._redis:
            return None
        try:
            raw = await self._redis.get(self.ALL_POLICIES_KEY)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Feature store get_all_policies error: {e}")
        return None

    async def set_all_policies(
        self,
        policies: List[Dict[str, Any]],
        ttl: int = 600,  # 10 min - policy catalog refreshes frequently
    ) -> bool:
        if not self._redis:
            return False
        try:
            await self._redis.setex(self.ALL_POLICIES_KEY, ttl, json.dumps(policies))
            return True
        except Exception:
            return False

    async def get_policies_by_category(
        self,
        category: str,
    ) -> Optional[List[Dict[str, Any]]]:
        if not self._redis:
            return None
        try:
            key = self.POLICY_LIST_KEY.format(category=category)
            raw = await self._redis.get(key)
            if raw:
                return json.loads(raw)
        except Exception:
            return None

    async def set_policies_by_category(
        self,
        category: str,
        policies: List[Dict[str, Any]],
        ttl: int = 600,
    ) -> bool:
        if not self._redis:
            return False
        try:
            key = self.POLICY_LIST_KEY.format(category=category)
            await self._redis.setex(key, ttl, json.dumps(policies))
            return True
        except Exception:
            return False

    # ── Recommendation Cache ───────────────────────────────────────────────

    async def get_recommendations(
        self,
        user_id: str,
        category: Optional[str] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        if not self._redis:
            return None
        try:
            key = f"rec:{user_id}:{category or 'all'}"
            raw = await self._redis.get(key)
            if raw:
                logger.debug(f"Recommendation cache hit for user {user_id}")
                return json.loads(raw)
        except Exception:
            return None

    async def set_recommendations(
        self,
        user_id: str,
        recommendations: List[Dict[str, Any]],
        category: Optional[str] = None,
        ttl: int = None,
    ) -> bool:
        if not self._redis:
            return False
        try:
            key = f"rec:{user_id}:{category or 'all'}"
            ttl = ttl or settings.RECOMMENDATION_CACHE_TTL
            await self._redis.setex(key, ttl, json.dumps(recommendations))
            return True
        except Exception:
            return False

    async def invalidate_recommendations(self, user_id: str) -> int:
        """Delete all cached recommendations for a user (after profile update)."""
        if not self._redis:
            return 0
        try:
            keys = await self._redis.keys(f"rec:{user_id}:*")
            if keys:
                return await self._redis.delete(*keys)
        except Exception:
            pass
        return 0

    # ── Bulk Operations ────────────────────────────────────────────────────

    async def bulk_set_policy_features(
        self,
        policies: List[Dict[str, Any]],
        ttl: int = 3600,
    ) -> int:
        """Materialize all policy features into Redis (called after training)."""
        if not self._redis:
            return 0
        count = 0
        pipeline = self._redis.pipeline()
        for policy in policies:
            key = self.POLICY_FEATURES_KEY.format(policy_id=policy["id"])
            pipeline.setex(key, ttl, json.dumps(policy))
            count += 1
        await pipeline.execute()
        return count


# ── Singleton ─────────────────────────────────────────────────────────────
feature_store = FeatureStore()
