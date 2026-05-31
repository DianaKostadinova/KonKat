package com.example.konkat.config

/**
 * Central registry of cache names used with @Cacheable / @CacheEvict.
 * Keeps cache keys consistent and easy to find with "Find Usages".
 */
object CacheNames {
    /** User public profile (stats + info). Key: userId */
    const val USER_PROFILE = "userProfile"

    /** Trending tags list. Key: "global" (single entry) */
    const val TRENDING_TAGS = "trendingTags"

    /** Unread notification count. Key: userId */
    const val UNREAD_COUNT = "unreadCount"

    /** Follower + following counts. Key: userId */
    const val FOLLOW_COUNTS = "followCounts"

    /** Search results. Key: query + limit hash */
    const val SEARCH_RESULTS = "searchResults"
}
