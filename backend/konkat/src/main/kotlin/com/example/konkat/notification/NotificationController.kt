package com.example.konkat.notification

import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.LocalDateTime

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

data class NotificationDto(
    val id: Long,
    val type: String,
    val actorId: Long?,
    val actorName: String?,
    val actorAvatar: String?,
    val hackathonId: Long?,
    val postId: Long?,
    val projectId: Long?,
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

    /** GET /api/notifications — all notifications for the current user, newest first */
    @GetMapping
    fun getAll(request: HttpServletRequest): ResponseEntity<List<NotificationDto>> {
        val userId = request.getAttribute("userId") as Long
        val list   = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
        return ResponseEntity.ok(list.map { it.toDto() })
    }

    /** POST /api/notifications/{id}/read — mark one as read */
    @PostMapping("/{id}/read")
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
    fun markAllRead(request: HttpServletRequest): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
            .filter { !it.read }
            .forEach { it.read = true }
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
