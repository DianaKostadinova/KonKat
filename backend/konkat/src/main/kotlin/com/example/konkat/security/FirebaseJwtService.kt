package com.example.konkat.security

import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwtIssuerValidator
import org.springframework.security.oauth2.jwt.JwtTimestampValidator
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class FirebaseJwtService(
    private val userRepository: UserRepository,
    @Value("\${app.firebase.jwks-uri}") private val jwksUri: String,
    @Value("\${app.firebase.project-id}") private val projectId: String,
) {

    val decoder by lazy {
        NimbusJwtDecoder.withJwkSetUri(jwksUri)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .build()
            .also {
                it.setJwtValidator(DelegatingOAuth2TokenValidator(
                    JwtTimestampValidator(java.time.Duration.ofMinutes(1)),
                    JwtIssuerValidator("https://securetoken.google.com/$projectId"),
                ))
            }
    }

    @Transactional
    fun resolveUser(token: String): User? = try {
        val jwt         = decoder.decode(token)
        val firebaseUid = jwt.subject
        val email       = jwt.getClaimAsString("email") ?: ""
        val name        = jwt.getClaimAsString("name")
            ?: email.substringBefore("@").ifBlank { firebaseUid }

        userRepository.findByFirebaseUid(firebaseUid).orElseGet {
            val byEmail = if (email.isNotBlank()) userRepository.findByEmail(email).orElse(null) else null
            when {
                byEmail != null && byEmail.firebaseUid == null -> {
                    byEmail.firebaseUid = firebaseUid
                    userRepository.save(byEmail)
                }
                byEmail != null -> byEmail
                else -> userRepository.save(
                    User(
                        firebaseUid = firebaseUid,
                        email       = if (email.isNotBlank()) email else "$firebaseUid@firebase.stub",
                        displayName = name,
                    )
                )
            }
        }
    } catch (_: Exception) {
        null
    }
}
