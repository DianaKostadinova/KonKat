package com.example.konkat.config

import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.cache.RedisCacheConfiguration
import org.springframework.data.redis.cache.RedisCacheManager
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.serializer.RedisSerializationContext
import org.springframework.data.redis.serializer.StringRedisSerializer
import java.time.Duration

/**
 * Redis configuration for caching and general key-value operations.
 *
 * Uses JDK serialization for cache values — simple, no Jackson config needed,
 * and all our DTOs are data classes which are Serializable-compatible via
 * Spring's default serializer.
 *
 * Cache names and their TTLs:
 *   - userProfile     → 5 min  (evicted on profile update)
 *   - trendingTags    → 2 min  (auto-expire, expensive aggregate)
 *   - unreadCount     → 30 sec (evicted on new notification / mark-read)
 *   - followCounts    → 5 min  (evicted on follow/unfollow)
 *   - searchResults   → 1 min  (auto-expire)
 */
@Configuration
@EnableCaching
class RedisConfig {

    @Bean
    fun cacheManager(connectionFactory: RedisConnectionFactory): CacheManager {
        val defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(5))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(StringRedisSerializer())
            )
            .disableCachingNullValues()

        val cacheConfigs = mapOf(
            "userProfile"   to defaultConfig.entryTtl(Duration.ofMinutes(5)),
            "trendingTags"  to defaultConfig.entryTtl(Duration.ofMinutes(2)),
            "unreadCount"   to defaultConfig.entryTtl(Duration.ofSeconds(30)),
            "followCounts"  to defaultConfig.entryTtl(Duration.ofMinutes(5)),
            "searchResults" to defaultConfig.entryTtl(Duration.ofMinutes(1)),
        )

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .transactionAware()
            .build()
    }

    /**
     * StringRedisTemplate for manual operations (rate limiting, counters, etc.)
     */
    @Bean
    fun stringRedisTemplate(connectionFactory: RedisConnectionFactory): StringRedisTemplate {
        return StringRedisTemplate(connectionFactory)
    }
}
