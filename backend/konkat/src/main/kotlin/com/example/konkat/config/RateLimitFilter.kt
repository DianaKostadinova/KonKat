package com.example.konkat.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Limits per authenticated user (userId) or per IP for anonymous requests.
 * Different limits apply to write operations (POST/PUT/DELETE/PATCH) vs reads (GET).
 *
 * For production with multiple backend replicas, replace with Redis + Bucket4j.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10) // after CORS, before security
class RateLimitFilter : OncePerRequestFilter() {

    companion object {
        // Sliding window = 60 seconds
        private const val WINDOW_MS = 60_000L

        // Read limits (GET)
        private const val READ_LIMIT = 300          // 300 GET requests / minute

        // Write limits (POST/PUT/DELETE/PATCH)
        private const val WRITE_LIMIT = 60          // 60 writes / minute

        // Upload-specific (more restrictive)
        private const val UPLOAD_LIMIT = 10         // 10 uploads / minute

        // Cleanup stale entries every 5 minutes
        private const val CLEANUP_INTERVAL_MS = 300_000L
    }

    private data class Window(
        val count: AtomicInteger = AtomicInteger(0),
        val windowStart: AtomicLong = AtomicLong(System.currentTimeMillis()),
    )

    private val readWindows  = ConcurrentHashMap<String, Window>()
    private val writeWindows = ConcurrentHashMap<String, Window>()
    private val uploadWindows = ConcurrentHashMap<String, Window>()

    @Volatile
    private var lastCleanup = System.currentTimeMillis()

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        // Skip WebSocket upgrade requests
        if (request.requestURI.startsWith("/ws")) {
            chain.doFilter(request, response)
            return
        }

        // Skip OPTIONS (CORS preflight)
        if (request.method == "OPTIONS") {
            chain.doFilter(request, response)
            return
        }

        val key = resolveKey(request)
        val now = System.currentTimeMillis()

        // Periodic cleanup of stale entries
        if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
            lastCleanup = now
            cleanup(now)
        }

        val isUpload = request.requestURI.contains("/upload")
        val isWrite  = request.method in setOf("POST", "PUT", "DELETE", "PATCH")

        val (windows, limit) = when {
            isUpload -> uploadWindows to UPLOAD_LIMIT
            isWrite  -> writeWindows to WRITE_LIMIT
            else     -> readWindows to READ_LIMIT
        }

        val window = windows.computeIfAbsent(key) { Window() }

        // Reset window if expired
        if (now - window.windowStart.get() > WINDOW_MS) {
            window.windowStart.set(now)
            window.count.set(0)
        }

        val current = window.count.incrementAndGet()
        if (current > limit) {
            response.status = HttpStatus.TOO_MANY_REQUESTS.value()
            response.contentType = "application/json"
            val retryAfter = ((window.windowStart.get() + WINDOW_MS - now) / 1000).coerceAtLeast(1)
            response.setHeader("Retry-After", retryAfter.toString())
            response.writer.write("""{"status":429,"error":"Too Many Requests","message":"Rate limit exceeded. Try again in ${retryAfter}s."}""")
            return
        }

        // Add rate limit headers
        response.setHeader("X-RateLimit-Limit", limit.toString())
        response.setHeader("X-RateLimit-Remaining", (limit - current).coerceAtLeast(0).toString())

        chain.doFilter(request, response)
    }

    private fun resolveKey(request: HttpServletRequest): String {
        // Prefer userId (set by FirebaseJwtFilter) for authenticated requests
        val userId = request.getAttribute("userId") as? Long
        if (userId != null) return "user:$userId"

        // Fall back to IP — use X-Forwarded-For if behind a proxy
        val forwarded = request.getHeader("X-Forwarded-For")
        val ip = forwarded?.split(",")?.firstOrNull()?.trim() ?: request.remoteAddr
        return "ip:$ip"
    }

    private fun cleanup(now: Long) {
        listOf(readWindows, writeWindows, uploadWindows).forEach { map ->
            map.entries.removeIf { now - it.value.windowStart.get() > WINDOW_MS * 2 }
        }
    }
}
