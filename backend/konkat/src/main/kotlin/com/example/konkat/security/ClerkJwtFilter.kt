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
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwtTimestampValidator
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

    private val decoder by lazy {
        NimbusJwtDecoder.withJwkSetUri(jwksUri)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .build()
            .also { it.setJwtValidator(JwtTimestampValidator(java.time.Duration.ofMinutes(1))) }
    }

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
                // Only attempt email lookup if the JWT includes an email claim
                val byEmail = if (email.isNotBlank()) userRepository.findByEmail(email).orElse(null) else null
                if (byEmail != null) {
                    if (byEmail.clerkId == null) {
                        byEmail.clerkId = clerkId
                        userRepository.save(byEmail)
                    } else {
                        byEmail
                    }
                } else {
                    // Create a minimal stub — clerkSync will merge it with the real account later
                    userRepository.save(
                        User(
                            clerkId     = clerkId,
                            email       = if (email.isNotBlank()) email else "$clerkId@clerk.stub",
                            displayName = displayName.ifBlank { clerkId },
                        )
                    )
                }
            }

            request.setAttribute("userId", user.id)
            val auth = UsernamePasswordAuthenticationToken(
                clerkId, null, listOf(SimpleGrantedAuthority("ROLE_USER"))
            ).also { it.details = WebAuthenticationDetailsSource().buildDetails(request) }
            SecurityContextHolder.getContext().authentication = auth
            log.debug("Clerk auth: clerkId={} userId={}", clerkId, user.id)

        } catch (ex: Exception) {
            log.warn("Clerk JWT rejected for {} {} — {}: {}", request.method, request.requestURI, ex.javaClass.simpleName, ex.message, ex)
        }

        chain.doFilter(request, response)
    }
}
