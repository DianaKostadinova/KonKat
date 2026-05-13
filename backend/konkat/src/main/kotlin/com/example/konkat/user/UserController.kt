package com.example.konkat.user

import com.example.konkat.post.PostRepository
import com.example.konkat.social.FollowRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/users")
@Transactional
class UserController(
    private val userRepository: UserRepository,
    private val followRepository: FollowRepository,
    private val postRepository: PostRepository,
) {

    // ── Own profile ───────────────────────────────────────────────────────────

    /**
     * GET /api/users/me
     * Returns the authenticated user's full profile with real stats.
     */
    @GetMapping("/me")
    fun getMe(request: HttpServletRequest): ResponseEntity<UserProfileDto> {
        val userId = request.getAttribute("userId") as Long
        val user   = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        return ResponseEntity.ok(user.toProfileDto(
            postCount      = postRepository.countByAuthorId(userId),
            followerCount  = followRepository.countByFollowingId(userId),
            followingCount = followRepository.countByFollowerId(userId),
            isFollowing    = false,   // can't follow yourself
        ))
    }

    /**
     * POST /api/users/me/clerk-sync
     * Called once after Clerk login. Links the Clerk account to an existing DB
     * account by email (handles users who registered before Clerk was added).
     * Also syncs name / avatar if the DB record is still empty.
     */
    @PostMapping("/me/clerk-sync")
    fun clerkSync(
        @RequestBody body: ClerkSyncRequest,
        request: HttpServletRequest,
    ): ResponseEntity<UserProfileDto> {
        val clerkUserId = request.getAttribute("userId") as Long
        val clerkUser   = userRepository.findById(clerkUserId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }

        // Find a pre-existing account with the same email
        val oldUser = if (body.email.isNotBlank())
            userRepository.findByEmail(body.email).orElse(null)
        else null

        val finalUser = if (oldUser != null && oldUser.id != clerkUserId) {
            // Must clear clerk_id from the stub BEFORE setting it on oldUser —
            // both rows are in scope and the unique constraint fires at flush time.
            val clerkId = clerkUser.clerkId
            clerkUser.clerkId = null
            userRepository.saveAndFlush(clerkUser)   // flush the NULL immediately
            oldUser.clerkId = clerkId
            userRepository.save(oldUser)
            // Remove the empty stub created by ClerkJwtFilter (best-effort)
            try { userRepository.delete(clerkUser) } catch (_: Exception) { /* FK refs — leave it */ }
            oldUser
        } else {
            clerkUser
        }

        // Sync Clerk data into blank fields only
        if (finalUser.displayName.isBlank() && !body.name.isNullOrBlank())
            finalUser.displayName = body.name
        if (finalUser.avatarUrl == null && !body.avatarUrl.isNullOrBlank())
            finalUser.avatarUrl = body.avatarUrl

        val saved = userRepository.save(finalUser)
        return ResponseEntity.ok(saved.toProfileDto(
            postCount      = postRepository.countByAuthorId(saved.id),
            followerCount  = followRepository.countByFollowingId(saved.id),
            followingCount = followRepository.countByFollowerId(saved.id),
        ))
    }

    /**
     * PUT /api/users/me
     * Updates the authenticated user's profile and persists to DB.
     */
    @PutMapping("/me")
    fun updateMe(
        @jakarta.validation.Valid @RequestBody body: UpdateProfileRequest,
        request: HttpServletRequest,
    ): ResponseEntity<UserProfileDto> {
        val userId = request.getAttribute("userId") as Long
        val user   = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }

        // Username uniqueness check
        if (!body.username.isNullOrBlank() && body.username != user.username) {
            if (userRepository.existsByUsername(body.username))
                throw ResponseStatusException(HttpStatus.CONFLICT, "Username already taken")
        }

        body.displayName?.takeIf   { it.isNotBlank() }?.let { user.displayName  = it }
        body.username?.let         { user.username      = it.ifBlank { null } }
        body.title?.let            { user.title         = it.ifBlank { null } }
        body.bio?.let              { user.bio           = it.ifBlank { null } }
        body.location?.let         { user.location      = it.ifBlank { null } }
        body.company?.let          { user.company       = it.ifBlank { null } }
        body.github?.let           { user.github        = it.ifBlank { null } }
        body.website?.let          { user.website       = it.ifBlank { null } }
        body.avatarUrl?.let        { user.avatarUrl     = it.ifBlank { null } }
        body.coverColor?.let       { user.coverColor    = it }
        body.coverImageUrl?.let    { user.coverImageUrl = it.ifBlank { null } }

        body.techStack?.let  { user.techStack.clear();  user.techStack.addAll(it)  }
        body.interests?.let  { user.interests.clear();  user.interests.addAll(it)  }

        val saved = userRepository.save(user)
        return ResponseEntity.ok(saved.toProfileDto(
            postCount      = postRepository.countByAuthorId(userId),
            followerCount  = followRepository.countByFollowingId(userId),
            followingCount = followRepository.countByFollowerId(userId),
            isFollowing    = false,
        ))
    }

    // ── Username availability ─────────────────────────────────────────────────

    /**
     * GET /api/users/check-username?username=...
     * Public endpoint — returns whether the username is available.
     */
    @GetMapping("/check-username")
    fun checkUsername(@RequestParam username: String): ResponseEntity<Map<String, Boolean>> {
        val available = username.isNotBlank() && !userRepository.existsByUsername(username)
        return ResponseEntity.ok(mapOf("available" to available))
    }

    // ── Public profile ────────────────────────────────────────────────────────

    /**
     * GET /api/users/:id
     * Returns any user's public profile.
     * If the requester is logged in, includes whether they follow this user.
     */
    @GetMapping("/{id}")
    fun getUser(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<UserProfileDto> {
        val currentUserId = request.getAttribute("userId") as? Long
        val user          = userRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        val isFollowing = currentUserId
            ?.takeIf { it != id }
            ?.let { followRepository.existsByFollowerIdAndFollowingId(it, id) }
            ?: false

        return ResponseEntity.ok(user.toProfileDto(
            postCount      = postRepository.countByAuthorId(id),
            followerCount  = followRepository.countByFollowingId(id),
            followingCount = followRepository.countByFollowerId(id),
            isFollowing    = isFollowing,
        ))
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class UserProfileDto(
    val id: Long,
    val name: String,
    val username: String?,
    val role: String?,
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
    val isFollowing: Boolean = false,   // is the requesting user following this profile?
)

data class BadgeDto(val label: String, val color: String)

data class StatsDto(
    val posts: Int      = 0,
    val projects: Int   = 0,
    val hackathons: Int = 0,
    val rep: Int        = 0,
    val followers: Int  = 0,
    val following: Int  = 0,
)

data class ClerkSyncRequest(
    val email: String = "",
    val name: String? = null,
    val avatarUrl: String? = null,
)

data class UpdateProfileRequest(
    @field:jakarta.validation.constraints.Size(max = 100, message = "Display name must be at most 100 characters")
    val displayName: String?      = null,
    @field:jakarta.validation.constraints.Size(max = 50, message = "Username must be at most 50 characters")
    @field:jakarta.validation.constraints.Pattern(regexp = "^[a-zA-Z0-9_.-]*$", message = "Username may only contain letters, numbers, underscores, dots, and hyphens")
    val username: String?         = null,
    @field:jakarta.validation.constraints.Size(max = 100)
    val title: String?            = null,
    @field:jakarta.validation.constraints.Size(max = 1000)
    val bio: String?              = null,
    @field:jakarta.validation.constraints.Size(max = 200)
    val location: String?         = null,
    @field:jakarta.validation.constraints.Size(max = 200)
    val company: String?          = null,
    @field:jakarta.validation.constraints.Size(max = 200)
    val github: String?           = null,
    @field:jakarta.validation.constraints.Size(max = 500)
    val website: String?          = null,
    val avatarUrl: String?        = null,
    val coverColor: String?       = null,
    val coverImageUrl: String?    = null,
    @field:jakarta.validation.constraints.Size(max = 30, message = "At most 30 tech stack entries allowed")
    val techStack: List<String>?  = null,
    @field:jakarta.validation.constraints.Size(max = 30, message = "At most 30 interest entries allowed")
    val interests: List<String>?  = null,
)

// ── Mapping ───────────────────────────────────────────────────────────────────

private val monthFormatter = DateTimeFormatter.ofPattern("MMMM yyyy")

fun User.toProfileDto(
    postCount: Long      = 0,
    followerCount: Long  = 0,
    followingCount: Long = 0,
    isFollowing: Boolean = false,
) = UserProfileDto(
    id          = id,
    name        = displayName,
    username    = username,
    role        = title,
    company     = company,
    location    = location,
    bio         = bio,
    github      = github,
    website     = website,
    avatar      = avatarUrl,
    coverColor  = coverColor ?: "#E8593C",
    coverImage  = coverImageUrl,
    techStack   = techStack.toList(),
    interests   = interests.toList(),
    badges      = emptyList(),
    joinedAt    = joinedAt?.format(monthFormatter) ?: "Member",
    isFollowing = isFollowing,
    stats       = StatsDto(
        posts      = postCount.toInt(),
        followers  = followerCount.toInt(),
        following  = followingCount.toInt(),
        // projects + hackathons + rep will be real once those features are built
    ),
)
