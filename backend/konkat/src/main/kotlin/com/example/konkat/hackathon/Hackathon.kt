package com.example.konkat.hackathon

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

// ── Status ────────────────────────────────────────────────────────────────────

enum class HackathonStatus {
    DRAFT,          // being set up, not yet visible
    UPCOMING,       // published, registration not open yet
    OPEN,           // registration open
    IN_PROGRESS,    // currently running
    COMPLETED,      // finished
    CANCELLED,
}

// ── Hackathon ─────────────────────────────────────────────────────────────────

/**
 * A hackathon event created by a user (the organiser).
 *
 * Table: hackathons
 *
 * Tags are stored in a separate collection table: hackathon_tags(hackathon_id, tag)
 * so you can filter hackathons by topic without a full-text search.
 */
@Entity
@Table(name = "hackathons")
class Hackathon(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** The user who created and runs this hackathon */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    val organizer: User,

    @Column(nullable = false)
    var title: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    var startDate: LocalDateTime? = null,
    var endDate: LocalDateTime? = null,

    /** Human-readable prize description: "€5 000 cash", "MacBook Pro", etc. */
    var prize: String? = null,

    /** Maximum people per team; null = no limit */
    var maxTeamSize: Int? = null,

    /** "Remote", "Berlin", "Online + Dublin", etc. */
    var location: String? = null,

    /** Banner / cover image stored as URL or base64 */
    @Column(columnDefinition = "TEXT")
    var bannerUrl: String? = null,

    @Enumerated(EnumType.STRING)
    var status: HackathonStatus = HackathonStatus.DRAFT,

    /**
     * Topic tags for filtering: ["AI", "Web3", "Climate Tech"]
     * Table: hackathon_tags(hackathon_id, tag)
     */
    @ElementCollection
    @CollectionTable(name = "hackathon_tags", joinColumns = [JoinColumn(name = "hackathon_id")])
    @Column(name = "tag")
    var tags: MutableList<String> = mutableListOf(),

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

// ── Participants ──────────────────────────────────────────────────────────────

/**
 * A user who has registered for a hackathon.
 *
 * Table: hackathon_participants
 *
 * Multiple users can share the same teamName — that's how teams are formed.
 * Example: Diana and John both have teamName="ByteBuilders" in hackathon 3.
 *
 * Unique constraint: one registration per user per hackathon.
 */
@Entity
@Table(
    name = "hackathon_participants",
    uniqueConstraints = [UniqueConstraint(columnNames = ["hackathon_id", "user_id"])]
)
class HackathonParticipant(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    val hackathon: Hackathon,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    /** Optional team name — users with the same name form a team */
    var teamName: String? = null,

    /** What they're contributing: "Backend", "ML Engineer", "Designer" */
    var role: String? = null,

    @CreationTimestamp
    val joinedAt: LocalDateTime? = null,
)
