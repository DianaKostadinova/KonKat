package com.example.konkat.security

import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwtTimestampValidator
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Shared Clerk JWT validation used by ClerkJwtFilter (HTTP) and
 * WebSocketAuthInterceptor (STOMP CONNECT).
 */
@Service
class ClerkJwtService(
    private val userRepository: UserRepository,
    @Value("\${app.clerk.jwks-uri}") private val jwksUri: String,
) {

    val decoder by lazy {
        NimbusJwtDecoder.withJwkSetUri(jwksUri)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .build()
            .also { it.setJwtValidator(JwtTimestampValidator(java.time.Duration.ofMinutes(1))) }
    }

    /**
     * Validates [token] and returns the corresponding DB [User], creating one
     * if it doesn't exist yet. Returns null if the token is invalid.
     */
    @Transactional
    fun resolveUser(token: String): User? = try {
        val jwt = decoder.decode(token)
        val clerkId = jwt.subject
        val email = jwt.getClaimAsString("email") ?: ""
        val firstName = jwt.getClaimAsString("first_name") ?: ""
        val lastName = jwt.getClaimAsString("last_name") ?: ""
        val displayName = listOf(firstName, lastName)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { email.substringBefore("@") }

        userRepository.findByClerkId(clerkId).orElseGet {
            val byEmail = if (email.isNotBlank()) userRepository.findByEmail(email).orElse(null) else null
            when {
                byEmail != null && byEmail.clerkId == null -> {
                    byEmail.clerkId = clerkId
                    userRepository.save(byEmail)
                }
                byEmail != null -> byEmail
                else -> userRepository.save(
                    User(
                        clerkId = clerkId,
                        email = if (email.isNotBlank()) email else "$clerkId@clerk.stub",
                        displayName = displayName.ifBlank { clerkId },
                    )
                )
            }
        }
    } catch (_: Exception) {
        null
    }
}
