package com.example.konkat.auth

import com.example.konkat.security.JwtService
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val resetTokenRepository: PasswordResetTokenRepository,
) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/register")
    fun register(@RequestBody req: RegisterRequest): ResponseEntity<AuthResponse> {
        val email       = req.email?.trim()?.lowercase()
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Email is required"))
        val password    = req.password
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Password is required"))
        val displayName = req.displayName?.trim()
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Display name is required"))

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(AuthResponse(error = "Email already in use"))
        }

        val encoded = passwordEncoder.encode(password) ?: error("Password encoding failed")
        val user  = User(email = email, password = encoded, displayName = displayName)
        val saved = userRepository.save(user)
        val token = jwtService.generateToken(saved.email, saved.id)

        return ResponseEntity.status(HttpStatus.CREATED).body(AuthResponse(token = token, user = saved.toDto()))
    }

    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest): ResponseEntity<AuthResponse> {
        val email    = req.email?.trim()?.lowercase()
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Email is required"))
        val password = req.password
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Password is required"))

        val user = userRepository.findByEmail(email).orElse(null)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(AuthResponse(error = "Invalid credentials"))

        if (!passwordEncoder.matches(password, user.password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(AuthResponse(error = "Invalid credentials"))
        }

        val token = jwtService.generateToken(user.email, user.id)
        return ResponseEntity.ok(AuthResponse(token = token, user = user.toDto()))
    }

    /**
     * POST /api/auth/forgot-password
     *
     * Always returns 200 with a generic message regardless of whether the email exists
     * (to prevent user enumeration attacks).
     *
     * In development the reset token is also returned in the response body so you can
     * test without an email server.  Remove `devToken` before going to production.
     */
    @Transactional
    @PostMapping("/forgot-password")
    fun forgotPassword(@RequestBody req: ForgotPasswordRequest): ResponseEntity<ForgotPasswordResponse> {
        val email = req.email?.trim()?.lowercase()
            ?: return ResponseEntity.badRequest().body(ForgotPasswordResponse(message = "Email is required"))

        val user = userRepository.findByEmail(email).orElse(null)
        if (user == null) {
            // Don't reveal whether the email exists
            return ResponseEntity.ok(ForgotPasswordResponse(message = "If that email is registered, a reset link has been sent."))
        }

        // Invalidate any existing unused tokens for this user
        resetTokenRepository.deleteActiveTokensForUser(user.id, LocalDateTime.now())

        val resetToken = resetTokenRepository.save(
            PasswordResetToken(user = user, expiresAt = LocalDateTime.now().plusHours(1))
        )

        // In production this is where you'd send the email.
        // For now, log it so it's easy to find during development.
        log.info("Password reset token for {}: {}", email, resetToken.token)

        return ResponseEntity.ok(
            ForgotPasswordResponse(
                message  = "If that email is registered, a reset link has been sent.",
                devToken = resetToken.token,   // ← remove in production
            )
        )
    }

    /**
     * POST /api/auth/reset-password
     *
     * Validates the token and sets the new password.
     */
    @Transactional
    @PostMapping("/reset-password")
    fun resetPassword(@RequestBody req: ResetPasswordRequest): ResponseEntity<AuthResponse> {
        val token       = req.token?.trim()
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Token is required"))
        val newPassword = req.newPassword
            ?: return ResponseEntity.badRequest().body(AuthResponse(error = "New password is required"))

        val resetToken = resetTokenRepository.findByToken(token)
            ?: return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponse(error = "Invalid or expired reset link"))

        if (resetToken.used) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponse(error = "This reset link has already been used"))
        }

        if (resetToken.expiresAt.isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponse(error = "This reset link has expired. Please request a new one."))
        }

        // Load the user directly (avoids lazy-loading the proxy on resetToken.user)
        val user = userRepository.findById(resetToken.user.id).orElseThrow {
            ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "User not found")
        }

        // Apply new password
        user.password = passwordEncoder.encode(newPassword) ?: error("Password encoding failed")
        userRepository.save(user)

        // Mark token as used
        resetToken.used = true
        resetTokenRepository.save(resetToken)

        // Auto-login: return a fresh JWT
        val jwt = jwtService.generateToken(user.email, user.id)
        return ResponseEntity.ok(AuthResponse(token = jwt, user = user.toDto()))
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class RegisterRequest(val email: String? = null, val password: String? = null, val displayName: String? = null)
data class LoginRequest(val email: String? = null, val password: String? = null)
data class ForgotPasswordRequest(val email: String? = null)
data class ResetPasswordRequest(val token: String? = null, val newPassword: String? = null)

data class AuthResponse(
    val token: String? = null,
    val user: UserDto? = null,
    val error: String? = null,
)

data class ForgotPasswordResponse(
    val message: String,
    val devToken: String? = null,   // only present in dev; remove before production
)

data class UserDto(val id: Long, val email: String, val displayName: String, val avatarUrl: String?)

fun User.toDto() = UserDto(id, email, displayName, avatarUrl)
