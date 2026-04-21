package com.example.konkat.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    private val jwtService: JwtService,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(JwtAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val header = request.getHeader("Authorization")
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response)
            return
        }

        val token = header.removePrefix("Bearer ").trim()
        try {
            if (jwtService.isValid(token)) {
                val email  = jwtService.extractEmail(token)
                val userId = jwtService.extractUserId(token)
                val auth = UsernamePasswordAuthenticationToken(
                    email,
                    null,
                    listOf(SimpleGrantedAuthority("ROLE_USER")),
                ).also { it.details = WebAuthenticationDetailsSource().buildDetails(request) }

                request.setAttribute("userId", userId)
                SecurityContextHolder.getContext().authentication = auth
                log.debug("Authenticated user {} (id={})", email, userId)
            } else {
                log.warn("JWT validation failed for request: {} {}", request.method, request.requestURI)
            }
        } catch (ex: Exception) {
            log.error("JWT processing error for {} {}: {}", request.method, request.requestURI, ex.message, ex)
            // Do NOT re-throw — let the request continue unauthenticated so Spring Security returns 401/403
        }

        chain.doFilter(request, response)
    }
}
