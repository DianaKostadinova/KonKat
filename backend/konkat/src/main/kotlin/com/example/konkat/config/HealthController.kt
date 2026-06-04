package com.example.konkat.config

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Lightweight liveness endpoint for uptime pingers (cron-job.org, UptimeRobot, Render
 * health checks, etc.). Deliberately tiny — no DB hit, no auth — so the keepalive ping
 * costs the JVM almost nothing.
 *
 * The route is allowlisted in [com.example.konkat.security.SecurityConfig].
 */
@RestController
class HealthController {

    @GetMapping("/health")
    fun health(): Map<String, String> = mapOf("status" to "ok")
}
