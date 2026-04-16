package com.example.konkat.auth

import com.example.konkat.security.JwtService
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {

    @PostMapping("/register")
    fun register(@RequestBody req: RegisterRequest): ResponseEntity<AuthResponse> {
        val email = req.email ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Email is required"))
        val password = req.password ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Password is required"))
        val displayName = req.displayName ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Display name is required"))

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(AuthResponse(error = "Email already in use"))
        }

        val user = User(
            email = email,
            password = passwordEncoder.encode(password)!!,
            displayName = displayName,
        )
        val saved = userRepository.save(user)
        val token = jwtService.generateToken(saved.email, saved.id)

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(AuthResponse(token = token, user = saved.toDto()))
    }

    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest): ResponseEntity<AuthResponse> {
        val email = req.email ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Email is required"))
        val password = req.password ?: return ResponseEntity.badRequest().body(AuthResponse(error = "Password is required"))

        val user = userRepository.findByEmail(email).orElse(null)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(AuthResponse(error = "Invalid credentials"))

        if (!passwordEncoder.matches(password, user.password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(AuthResponse(error = "Invalid credentials"))
        }

        val token = jwtService.generateToken(user.email, user.id)
        return ResponseEntity.ok(AuthResponse(token = token, user = user.toDto()))
    }
}

// --- DTOs ---

data class RegisterRequest(val email: String? = null, val password: String? = null, val displayName: String? = null)
data class LoginRequest(val email: String? = null, val password: String? = null)

data class AuthResponse(
    val token: String? = null,
    val user: UserDto? = null,
    val error: String? = null,
)

data class UserDto(val id: Long, val email: String, val displayName: String, val avatarUrl: String?)

fun User.toDto() = UserDto(id, email, displayName, avatarUrl)
