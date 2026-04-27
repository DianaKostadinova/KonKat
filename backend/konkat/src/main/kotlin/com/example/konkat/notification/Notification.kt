package com.example.konkat.notification

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Every possible reason a notification can be created.
 * The type tells the frontend which icon to show and what text to render.
 *
 * Examples:
 *   FOLLOW          → "John started following you"
 *   POST_LIKE       → "Diana liked your post"
 *   POST_COMMENT    → "John commented on your post"
 *   PROJECT_INTEREST → "Diana wants to join your project"
 *   BADGE_AWARDED   → "You earned the 'First Post' badge"
 */
enum class NotificationType {
    FOLLOW,
    POST_LIKE,
    POST_COMMENT,
    POST_SHARE,
    PROJECT_LIKE,
    PROJECT_INTEREST,   // someone clicked "I want to join"
    PROJECT_MEMBER,     // owner added you to a project
    HACKATHON_INVITE,   // someone invited you to their team
    HACKATHON_STARTED,  // a hackathon you registered for has begun
    HACKATHON_REGISTER, // someone registered for your hackathon
    HACKATHON_SAVED,    // someone saved your hackathon
    BADGE_AWARDED,
    MESSAGE,            // someone sent you a DM or group message
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * A single notification delivered to a user's inbox.
 *
 * Table: notifications
 *
 * Design decisions:
 * - actor can be null for system-generated notifications (e.g. BADGE_AWARDED)
 * - postId / projectId / hackathonId are plain Long? columns (not FK relationships)
 *   to keep inserts simple and avoid cascading issues when content is deleted.
 *   The service layer resolves them when building the response DTO.
 * - read defaults to false; updated to true when the user opens the notification.
 */
@Entity
@Table(name = "notifications")
class Notification(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** Who receives this notification */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    val recipient: User,

    /** Who triggered it — null for system notifications */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = true)
    val actor: User? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: NotificationType,

    // ── Optional references to the object this is about ───────────────────────
    // Stored as plain IDs rather than FK joins so the notification survives
    // even if the referenced content is later deleted.

    val postId: Long? = null,
    val projectId: Long? = null,
    val hackathonId: Long? = null,

    /** False until the user views/clicks the notification */
    var read: Boolean = false,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
