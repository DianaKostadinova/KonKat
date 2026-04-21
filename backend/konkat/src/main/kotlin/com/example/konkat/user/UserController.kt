package com.example.konkat.user

import jakarta.servlet.http.HttpServletRequest
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/users")
@Transactional
class UserController(private val userRepository: UserRepository) {

    /**
     * GET /api/users/me
     * Returns the full profile of the currently authenticated user.
     */
    @GetMapping("/me")
    fun getMe(request: HttpServletRequest): ResponseEntity<UserProfileDto> {
        val userId = request.getAttribute("userId") as Long
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        return ResponseEntity.ok(user.toProfileDto())
    }

    /**
     * PUT /api/users/me
     * Updates the authenticated user's profile fields and persists to DB.
     */
    @PutMapping("/me")
    fun updateMe(
        @RequestBody body: UpdateProfileRequest,
        request: HttpServletRequest,
    ): ResponseEntity<UserProfileDto> {
        val userId = request.getAttribute("userId") as Long
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }

        // Username uniqueness check
        if (!body.username.isNullOrBlank() && body.username != user.username) {
            if (userRepository.existsByUsername(body.username)) {
                throw ResponseStatusException(HttpStatus.CONFLICT, "Username already taken")
            }
        }

        body.displayName?.takeIf { it.isNotBlank() }?.let { user.displayName = it }
        body.username?.let { user.username = it.ifBlank { null } }
        body.title?.let { user.title = it.ifBlank { null } }
        body.bio?.let { user.bio = it.ifBlank { null } }
        body.location?.let { user.location = it.ifBlank { null } }
        body.company?.let { user.company = it.ifBlank { null } }
        body.github?.let { user.github = it.ifBlank { null } }
        body.website?.let { user.website = it.ifBlank { null } }
        body.avatarUrl?.let { user.avatarUrl = it.ifBlank { null } }
        body.coverColor?.let { user.coverColor = it }
        body.coverImageUrl?.let { user.coverImageUrl = it.ifBlank { null } }

        body.techStack?.let {
            user.techStack.clear()
            user.techStack.addAll(it)
        }
        body.interests?.let {
            user.interests.clear()
            user.interests.addAll(it)
        }

        val saved = userRepository.save(user)
        return ResponseEntity.ok(saved.toProfileDto())
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class UserProfileDto(
    val id: Long,
    val name: String,
    val username: String?,
    val role: String?,           // job title (maps to User.title)
    val company: String?,
    val location: String?,
    val bio: String?,
    val github: String?,
    val website: String?,
    val avatar: String?,
    val coverColor: String?,
    val coverImage: String?,
    val techStack: List<String>,
    val interests: List<String>,
    val badges: List<BadgeDto>,
    val joinedAt: String,
    val stats: StatsDto,
)

data class BadgeDto(val label: String, val color: String)

data class StatsDto(
    val posts: Int = 0,
    val projects: Int = 0,
    val hackathons: Int = 0,
    val rep: Int = 0,
    val followers: Int = 0,
    val following: Int = 0,
)

data class UpdateProfileRequest(
    val displayName: String? = null,
    val username: String? = null,
    val title: String? = null,
    val bio: String? = null,
    val location: String? = null,
    val company: String? = null,
    val github: String? = null,
    val website: String? = null,
    val avatarUrl: String? = null,
    val coverColor: String? = null,
    val coverImageUrl: String? = null,
    val techStack: List<String>? = null,
    val interests: List<String>? = null,
)

private val monthFormatter = DateTimeFormatter.ofPattern("MMMM yyyy")

fun User.toProfileDto() = UserProfileDto(
    id         = id,
    name       = displayName,
    username   = username,
    role       = title,
    company    = company,
    location   = location,
    bio        = bio,
    github     = github,
    website    = website,
    avatar     = avatarUrl,
    coverColor = coverColor ?: "#E8593C",
    coverImage = coverImageUrl,
    techStack  = techStack.toList(),
    interests  = interests.toList(),
    badges     = emptyList(),           // badges feature not yet implemented
    joinedAt   = joinedAt?.format(monthFormatter) ?: "Member",
    stats      = StatsDto(),
)
