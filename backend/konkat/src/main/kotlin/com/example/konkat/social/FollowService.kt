package com.example.konkat.social

import com.example.konkat.user.UserRepository
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

// ── DTOs ──────────────────────────────────────────────────────────────────────

/** Returned after every toggle so the frontend can update its button instantly */
data class FollowResultDto(
    val following: Boolean,     // true = now following, false = just unfollowed
    val followerCount: Long,    // updated count for the target user
)

/** Returned by GET /:id/follow — snapshot of the current follow state */
data class FollowStatusDto(
    val following: Boolean,
    val followerCount: Long,
    val followingCount: Long,
)

/** A single user card shown inside the followers / following list modal */
data class FollowUserDto(
    val id: Long,
    val name: String,
    val username: String?,
    val role: String?,         // job title
    val avatarUrl: String?,
    val location: String?,
)

// ── Service ───────────────────────────────────────────────────────────────────

@Service
@Transactional
class FollowService(
    private val followRepository: FollowRepository,
    private val userRepository: UserRepository,
) {

    /**
     * Toggle follow/unfollow.
     * If currentUser already follows target → unfollow.
     * If not → follow.
     * Returns the new state + updated follower count so the UI can react immediately.
     */
    fun toggle(currentUserId: Long, targetUserId: Long): FollowResultDto {
        if (currentUserId == targetUserId)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot follow yourself")

        val existing = followRepository.findByFollowerIdAndFollowingId(currentUserId, targetUserId)

        return if (existing != null) {
            // Already following → unfollow
            followRepository.delete(existing)
            FollowResultDto(
                following     = false,
                followerCount = followRepository.countByFollowingId(targetUserId),
            )
        } else {
            // Not following → follow
            val follower = userRepository.findById(currentUserId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
            }
            val following = userRepository.findById(targetUserId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
            }
            followRepository.save(UserFollow(follower = follower, following = following))
            FollowResultDto(
                following     = true,
                followerCount = followRepository.countByFollowingId(targetUserId),
            )
        }
    }

    fun isFollowing(currentUserId: Long, targetUserId: Long): Boolean =
        followRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId)

    fun getStatus(currentUserId: Long, targetUserId: Long) = FollowStatusDto(
        following      = followRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId),
        followerCount  = followRepository.countByFollowingId(targetUserId),
        followingCount = followRepository.countByFollowerId(targetUserId),
    )

    fun getFollowerCount(userId: Long)  = followRepository.countByFollowingId(userId)
    fun getFollowingCount(userId: Long) = followRepository.countByFollowerId(userId)

    /** Returns the list of users who follow userId */
    fun getFollowers(userId: Long): List<FollowUserDto> =
        followRepository.findByFollowingId(userId)
            .map { it.follower.toFollowUserDto() }

    /** Returns the list of users that userId follows */
    fun getFollowing(userId: Long): List<FollowUserDto> =
        followRepository.findByFollowerId(userId)
            .map { it.following.toFollowUserDto() }
}

// ── Mapping helper ────────────────────────────────────────────────────────────

private fun com.example.konkat.user.User.toFollowUserDto() = FollowUserDto(
    id        = id,
    name      = displayName,
    username  = username,
    role      = title,
    avatarUrl = avatarUrl,
    location  = location,
)
