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
class FirebaseJwtFilter(
    private val firebaseJwtService: FirebaseJwtService,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(FirebaseJwtFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val header = request.getHeader("Authorization")
        log.debug("JWT filter: {} {} — Authorization: {}", request.method, request.requestURI,
            if (header == null) "MISSING" else if (header.startsWith("Bearer ")) "present" else "invalid")

        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response)
            return
        }

        val token = header.removePrefix("Bearer ").trim()
        try {
            val user = firebaseJwtService.resolveUser(token)
            if (user != null) {
                request.setAttribute("userId", user.id)
                val auth = UsernamePasswordAuthenticationToken(
                    user.firebaseUid ?: user.id.toString(), null, listOf(SimpleGrantedAuthority("ROLE_USER"))
                ).also { it.details = WebAuthenticationDetailsSource().buildDetails(request) }
                SecurityContextHolder.getContext().authentication = auth
                log.debug("Firebase auth: uid={} userId={}", user.firebaseUid, user.id)
            }
        } catch (ex: Exception) {
            log.warn("Firebase JWT rejected for {} {} — {}: {}",
                request.method, request.requestURI, ex.javaClass.simpleName, ex.message)
        }

        chain.doFilter(request, response)
    }
}
