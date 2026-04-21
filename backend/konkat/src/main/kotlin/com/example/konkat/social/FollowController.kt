package com.example.konkat.social

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * REST endpoints for following/unfollowing users.
 *
 * POST   /api/users/:id/follow  → toggle follow (follow if not, unfollow if yes)
 * GET    /api/users/:id/follow  → current follow state + counts
 */
@RestController
@RequestMapping("/api/users")
class FollowController(private val followService: FollowService) {

    /**
     * Toggle follow / unfollow.
     *
     * Returns the new following state and updated follower count so the
     * frontend button and counter update immediately without a second request.
     */
    @PostMapping("/{id}/follow")
    fun toggleFollow(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<FollowResultDto> {
        val currentUserId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(followService.toggle(currentUserId, id))
    }

    /**
     * Check follow state.
     *
     * Called when a profile page loads so the button shows the right label
     * ("Follow" or "Following") without waiting for a toggle action.
     */
    @GetMapping("/{id}/follow")
    fun getFollowStatus(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<FollowStatusDto> {
        val currentUserId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(followService.getStatus(currentUserId, id))
    }
}
