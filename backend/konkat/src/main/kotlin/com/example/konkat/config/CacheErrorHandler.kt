package com.example.konkat.config

import org.slf4j.LoggerFactory
import org.springframework.cache.Cache
import org.springframework.cache.annotation.CachingConfigurer
import org.springframework.cache.interceptor.CacheErrorHandler
import org.springframework.context.annotation.Configuration

/**
 * Graceful degradation: if Redis is down, log a warning and let the request
 * proceed uncached instead of failing with a connection error.
 *
 * This means the app works fine without Redis — just without caching.
 */
@Configuration
class CacheErrorConfig : CachingConfigurer {

    override fun errorHandler(): CacheErrorHandler = object : CacheErrorHandler {

        private val log = LoggerFactory.getLogger("CacheErrorHandler")

        override fun handleCacheGetError(ex: RuntimeException, cache: Cache, key: Any) {
            log.warn("Cache GET failed [{}:{}]: {}", cache.name, key, ex.message)
        }

        override fun handleCachePutError(ex: RuntimeException, cache: Cache, key: Any, value: Any?) {
            log.warn("Cache PUT failed [{}:{}]: {}", cache.name, key, ex.message)
        }

        override fun handleCacheEvictError(ex: RuntimeException, cache: Cache, key: Any) {
            log.warn("Cache EVICT failed [{}:{}]: {}", cache.name, key, ex.message)
        }

        override fun handleCacheClearError(ex: RuntimeException, cache: Cache) {
            log.warn("Cache CLEAR failed [{}]: {}", cache.name, ex.message)
        }
    }
}
