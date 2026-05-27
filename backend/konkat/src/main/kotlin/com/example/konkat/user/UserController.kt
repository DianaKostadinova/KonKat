package com.example.konkat.user

import com.example.konkat.event.SavedEventRepository
import com.example.konkat.notification.NotificationRepository
import com.example.konkat.post.PostRepository
import com.example.konkat.social.FollowRepository
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/users")
@Transactional
class UserController(
    private val userRepository: UserRepository,
    private val followRepository: FollowRepository,
    private val postRepository: PostRepository,
    private val reputationService: ReputationService,
    private val minigameSolveRepository: MinigameSolveRepository,
    private val savedEventRepository: SavedEventRepository,
    private val notificationRepository: NotificationRepository,
) {
    private val log = LoggerFactory.getLogger(UserController::class.java)

    // ── Own profile ───────────────────────────────────────────────────────────

    /**
     * GET /api/users/me
     * Returns the authenticated user's full profile with real stats.
     */
    @GetMapping("/me")
    fun getMe(request: HttpServletRequest): ResponseEntity<UserProfileDto> {
        val userId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
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
        val clerkUserId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
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
            userRepository.saveAndFlush(clerkUser)   // flush the NULL immediately so the unique constraint doesn't fire
            oldUser.clerkId = clerkId
            userRepository.save(oldUser)
            // Intentionally leave the stub row — deleting it inside this transaction can cause
            // a rollback-only state if it has any FK references, breaking the whole sync.
            // The stub is harmless with a null clerkId: the filter finds the real account by clerkId.
            oldUser
        } else {
            clerkUser
        }

        // Always sync name/avatar from Clerk — overrides the clerkId stub that ClerkJwtFilter creates
        if (!body.name.isNullOrBlank())
            finalUser.displayName = body.name
        if (!body.avatarUrl.isNullOrBlank() && finalUser.avatarUrl.isNullOrBlank())
            finalUser.avatarUrl = body.avatarUrl
        // Set username from Clerk sign-up if the user doesn't have one yet
        if (!body.username.isNullOrBlank() && finalUser.username.isNullOrBlank()) {
            if (!userRepository.existsByUsername(body.username))
                finalUser.username = body.username
        }

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
        val userId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
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

    // ── Minigames ────────────────────────────────────────────────────────────

    /**
     * GET /api/users/leaderboard?limit=3
     * Returns the top-N users by reputation. Public.
     */
    @GetMapping("/leaderboard")
    fun leaderboard(@RequestParam(defaultValue = "3") limit: Int): ResponseEntity<List<LeaderboardEntryDto>> {
        val capped = limit.coerceIn(1, 50)
        val users  = userRepository.findAllByOrderByReputationDesc(PageRequest.of(0, capped))
        return ResponseEntity.ok(users.map {
            LeaderboardEntryDto(id = it.id, name = it.displayName, avatar = it.avatarUrl, rep = it.reputation)
        })
    }

    /**
     * POST /api/users/me/minigame-solve
     * Body: { "game": "wordle" | "pinpoint" | ... }
     * Grants +3 rep, idempotent per (user, game, day).
     */
    @PostMapping("/me/minigame-solve")
    fun minigameSolve(
        @RequestBody body: MinigameSolveRequest,
        request: HttpServletRequest,
    ): ResponseEntity<MinigameSolveResponse> {
        val userId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val game = body.game.trim().lowercase()
        if (game.isEmpty() || game.length > 32 || !game.matches(Regex("^[a-z0-9_-]+$"))) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid game key")
        }

        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        val today = LocalDate.now()
        val already = minigameSolveRepository.existsByUserIdAndGameAndSolveDate(userId, game, today)
        if (!already) {
            minigameSolveRepository.save(MinigameSolve(userId = userId, game = game, solveDate = today))
            reputationService.grant(user, ReputationAction.MINIGAME_SOLVE)
        }

        return ResponseEntity.ok(
            MinigameSolveResponse(rep = user.reputation, awarded = !already)
        )
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

    // ── Settings ──────────────────────────────────────────────────────────────

    /**
     * GET /api/users/me/settings
     * Returns the authenticated user's notification and privacy settings.
     */
    @GetMapping("/me/settings")
    fun getSettings(request: HttpServletRequest): ResponseEntity<UserSettingsDto> {
        val userId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        return ResponseEntity.ok(user.toSettingsDto())
    }

    /**
     * PUT /api/users/me/settings
     * Updates notification and privacy settings.
     */
    @PutMapping("/me/settings")
    fun updateSettings(
        @RequestBody body: UpdateSettingsRequest,
        request: HttpServletRequest,
    ): ResponseEntity<UserSettingsDto> {
        val userId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }

        body.emailOnFollow?.let      { user.emailOnFollow      = it }
        body.emailOnPostLike?.let    { user.emailOnPostLike    = it }
        body.emailOnPostComment?.let { user.emailOnPostComment = it }
        body.emailOnMessage?.let     { user.emailOnMessage     = it }
        body.emailOnHackathon?.let   { user.emailOnHackathon   = it }
        body.emailOnWebinar?.let     { user.emailOnWebinar     = it }
        body.emailOnQa?.let          { user.emailOnQa          = it }
        body.profileVisibility?.let  { user.profileVisibility  = ProfileVisibility.valueOf(it) }
        body.allowDms?.let           { user.allowDms           = AllowDms.valueOf(it) }
        body.showOnlineStatus?.let   { user.showOnlineStatus   = it }

        val saved = userRepository.save(user)
        return ResponseEntity.ok(saved.toSettingsDto())
    }

    /**
     * DELETE /api/users/me
     * Deletes the authenticated user's account and all associated data.
     */
    @DeleteMapping("/me")
    fun deleteAccount(request: HttpServletRequest): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as? Long
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        return try {
            // Delete saved events
            val savedEvents = savedEventRepository.findByUserId(userId)
            savedEventRepository.deleteAll(savedEvents)

            // Delete notifications where user is recipient
            val notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
            notificationRepository.deleteAll(notifications)

            // Delete the user
            userRepository.deleteById(userId)

            ResponseEntity.noContent().build()
        } catch (ex: Exception) {
            log.error("Failed to delete account for userId={}: {}", userId, ex.message)
            ResponseEntity.status(HttpStatus.CONFLICT).build()
        }
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

data class LeaderboardEntryDto(
    val id: Long,
    val name: String,
    val avatar: String?,
    val rep: Int,
)

data class MinigameSolveRequest(val game: String = "")
data class MinigameSolveResponse(val rep: Int, val awarded: Boolean)

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
    val username: String? = null,
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

data class UserSettingsDto(
    val emailOnFollow: Boolean,
    val emailOnPostLike: Boolean,
    val emailOnPostComment: Boolean,
    val emailOnMessage: Boolean,
    val emailOnHackathon: Boolean,
    val emailOnWebinar: Boolean,
    val emailOnQa: Boolean,
    val profileVisibility: String,
    val allowDms: String,
    val showOnlineStatus: Boolean,
)

data class UpdateSettingsRequest(
    val emailOnFollow: Boolean? = null,
    val emailOnPostLike: Boolean? = null,
    val emailOnPostComment: Boolean? = null,
    val emailOnMessage: Boolean? = null,
    val emailOnHackathon: Boolean? = null,
    val emailOnWebinar: Boolean? = null,
    val emailOnQa: Boolean? = null,
    val profileVisibility: String? = null,
    val allowDms: String? = null,
    val showOnlineStatus: Boolean? = null,
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
        rep        = reputation,
        // projects + hackathons will be real once those features are built
    ),
)

fun User.toSettingsDto() = UserSettingsDto(
    emailOnFollow      = emailOnFollow,
    emailOnPostLike    = emailOnPostLike,
    emailOnPostComment = emailOnPostComment,
    emailOnMessage     = emailOnMessage,
    emailOnHackathon   = emailOnHackathon,
    emailOnWebinar     = emailOnWebinar,
    emailOnQa          = emailOnQa,
    profileVisibility  = profileVisibility?.name ?: "PUBLIC",
    allowDms           = allowDms?.name ?: "EVERYONE",
    showOnlineStatus   = showOnlineStatus,
)
