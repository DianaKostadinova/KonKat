package com.example.konkat.security

import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class ClerkJwtFilter(
    private val userRepository: UserRepository,
    @Value("\${app.clerk.jwks-uri}") private val jwksUri: String,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(ClerkJwtFilter::class.java)

    private val decoder by lazy { NimbusJwtDecoder.withJwkSetUri(jwksUri).build() }

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
            val jwt     = decoder.decode(token)
            val clerkId = jwt.subject          // "user_2abc..."
            val email   = jwt.getClaimAsString("email") ?: ""
            val firstName  = jwt.getClaimAsString("first_name") ?: ""
            val lastName   = jwt.getClaimAsString("last_name")  ?: ""
            val displayName = listOf(firstName, lastName)
                .filter { it.isNotBlank() }
                .joinToString(" ")
                .ifBlank { email.substringBefore("@") }

            // Upsert: find existing user or create a new one
            val user = userRepository.findByClerkId(clerkId).orElseGet {
                // Check if there's an existing legacy user with the same email
                userRepository.findByEmail(email).orElseGet {
                    userRepository.save(
                        User(
                            clerkId     = clerkId,
                            email       = email,
                            displayName = displayName,
                        )
                    )
                }.also { existing ->
                    // Link the Clerk ID to the legacy account
                    if (existing.clerkId == null) {
                        existing.clerkId = clerkId
                        userRepository.save(existing)
                    }
                }
            }

            request.setAttribute("userId", user.id)
            val auth = UsernamePasswordAuthenticationToken(
                clerkId, null, listOf(SimpleGrantedAuthority("ROLE_USER"))
            ).also { it.details = WebAuthenticationDetailsSource().buildDetails(request) }
            SecurityContextHolder.getContext().authentication = auth
            log.debug("Clerk auth: clerkId={} userId={}", clerkId, user.id)

        } catch (ex: Exception) {
            log.warn("Clerk JWT rejected for {} {}: {}", request.method, request.requestURI, ex.message)
            // Let Spring Security handle the 401 — do not short-circuit here
        }

        chain.doFilter(request, response)
    }
}
