package com.example.konkat.badge

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

// ── Badge definition ──────────────────────────────────────────────────────────

/**
 * A badge that can be awarded to users for achievements.
 *
 * Table: badges
 *
 * This table is essentially a catalogue — rows are inserted once manually
 * (or via a data migration) and rarely change.
 *
 * Example rows:
 *   code="FIRST_POST",      label="First Post",       color="#10b981"
 *   code="100_FOLLOWERS",   label="Rising Star",      color="#f59e0b"
 *   code="HACKATHON_WIN",   label="Hackathon Winner", color="#ec4899"
 *   code="OPEN_SOURCE",     label="Open Source Hero", color="#6366f1"
 *
 * `code` is a stable machine-readable key used by the service to award badges.
 * `label` is what users see in the UI.
 * `icon` is a Material Icons name shown next to the label.
 */
@Entity
@Table(name = "badges")
class Badge(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** Stable unique identifier used in code, e.g. "FIRST_POST" */
    @Column(unique = true, nullable = false)
    val code: String,

    /** Display name shown in the UI */
    @Column(nullable = false)
    val label: String,

    val description: String? = null,

    /** Material Icons name, e.g. "emoji_events", "star", "code" */
    val icon: String? = null,

    /** Hex colour for the badge chip */
    val color: String = "#6366f1",
)

// ── User ↔ Badge join ─────────────────────────────────────────────────────────

/**
 * Records that a specific user has earned a specific badge.
 *
 * Table: user_badges
 *
 * The unique constraint means each badge can only be awarded once per user.
 * awardedAt lets you show "Earned March 2025" on the profile.
 *
 * To get all badges for user 1:
 *   SELECT b.* FROM badges b
 *   JOIN user_badges ub ON ub.badge_id = b.id
 *   WHERE ub.user_id = 1
 */
@Entity
@Table(
    name = "user_badges",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "badge_id"])]
)
class UserBadge(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "badge_id", nullable = false)
    val badge: Badge,

    @CreationTimestamp
    val awardedAt: LocalDateTime? = null,
)
