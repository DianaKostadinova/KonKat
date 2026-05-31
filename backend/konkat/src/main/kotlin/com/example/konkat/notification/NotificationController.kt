package com.example.konkat.notification

import com.example.konkat.config.CacheNames
import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.http.HttpStatus
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.LocalDateTime

private val ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")

data class NotificationDto(
    val id: Long,
    val type: String,
    val actorId: Long?,
    val actorName: String?,
    val actorAvatar: String?,
    val hackathonId: Long?,
    val postId: Long?,
    val projectId: Long?,
    val webinarId: Long?,
    val read: Boolean,
    val createdAt: String,
    val timeAgo: String,
)

@RestController
@RequestMapping("/api/notifications")
@Transactional
class NotificationController(
    private val notificationRepository: NotificationRepository,
    private val userRepository: UserRepository,
) {

    /** GET /api/notifications — all notifications for the current user, newest first (paginated) */
    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "30") size: Int,
        request: HttpServletRequest,
    ): ResponseEntity<List<NotificationDto>> {
        val userId   = request.getAttribute("userId") as Long
        val pageable = org.springframework.data.domain.PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, 100),
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"),
        )
        val list = notificationRepository.findByRecipientId(userId, pageable)
        return ResponseEntity.ok(list.map { it.toDto() })
    }

    /** GET /api/notifications/unread-count — efficient badge counter for the frontend (cached 30s) */
    @GetMapping("/unread-count")
    @Cacheable(CacheNames.UNREAD_COUNT, key = "#root.target.extractUserId(#request)")
    fun getUnreadCount(request: HttpServletRequest): Map<String, Long> {
        val userId = request.getAttribute("userId") as Long
        val count  = notificationRepository.countByRecipientIdAndReadFalse(userId)
        return mapOf("count" to count)
    }

    /** Helper for SpEL key expression — extracts userId from request */
    fun extractUserId(request: HttpServletRequest): Long =
        request.getAttribute("userId") as Long

    /** POST /api/notifications/{id}/read — mark one as read */
    @PostMapping("/{id}/read")
    @CacheEvict(CacheNames.UNREAD_COUNT, key = "#root.target.extractUserId(#request)")
    fun markRead(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        val notif  = notificationRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND)
        }
        if (notif.recipient.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        notif.read = true
        return ResponseEntity.noContent().build()
    }

    /** POST /api/notifications/read-all — mark every unread notification as read */
    @PostMapping("/read-all")
    @CacheEvict(CacheNames.UNREAD_COUNT, key = "#root.target.extractUserId(#request)")
    fun markAllRead(request: HttpServletRequest): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        notificationRepository.markAllReadByRecipientId(userId)
        return ResponseEntity.noContent().build()
    }

    /** DELETE /api/notifications/{id} — delete a notification */
    @DeleteMapping("/{id}")
    fun delete(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        val notif  = notificationRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND)
        }
        if (notif.recipient.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN)
        notificationRepository.delete(notif)
        return ResponseEntity.noContent().build()
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun Notification.toDto() = NotificationDto(
        id          = id,
        type        = type.name,
        actorId     = actor?.id,
        actorName   = actor?.displayName,
        actorAvatar = actor?.avatarUrl,
        hackathonId = hackathonId,
        postId      = postId,
        projectId   = projectId,
        webinarId   = webinarId,
        read        = read,
        createdAt   = createdAt?.format(ISO) ?: "",
        timeAgo     = createdAt?.toTimeAgo() ?: "",
    )

    private fun LocalDateTime.toTimeAgo(): String {
        val now = LocalDateTime.now()
        val secs = ChronoUnit.SECONDS.between(this, now)
        return when {
            secs < 60   -> "${secs}s ago"
            secs < 3600 -> "${secs / 60}m ago"
            secs < 86400 -> "${secs / 3600}h ago"
            else        -> "${secs / 86400}d ago"
        }
    }
}
