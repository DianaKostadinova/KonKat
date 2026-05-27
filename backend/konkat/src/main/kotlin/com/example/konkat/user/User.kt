package com.example.konkat.user
import org.hibernate.annotations.CreationTimestamp
import jakarta.persistence.*
import java.time.LocalDateTime

enum class ProfileVisibility { PUBLIC, CONNECTIONS, PRIVATE }
enum class AllowDms { EVERYONE, FOLLOWING, NOBODY }

@Entity
@Table(name = "users")
data class User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** Clerk user ID — set for all Clerk-authenticated users */
    @Column(unique = true)
    var clerkId: String? = null,

    @Column(unique = true, nullable = false)
    val email: String,

    /** Legacy field — not used for Clerk auth */
    @Column(nullable = false)
    var password: String = "",

    @Column(nullable = false)
    var displayName: String,

    @Column(unique = true)
    var username: String? = null,

    @Column(columnDefinition = "TEXT")           // base64 data-URLs can be 100s of KB
    var avatarUrl: String? = null,

    var title: String? = null,                   // job title, e.g. "Software Engineer"

    @Column(columnDefinition = "TEXT")
    var bio: String? = null,

    var location: String? = null,
    var company: String? = null,
    var github: String? = null,
    var website: String? = null,
    var coverColor: String? = null,

    @Column(columnDefinition = "TEXT")           // cover images are also base64
    var coverImageUrl: String? = null,

    @ElementCollection
    @CollectionTable(name = "user_tech_stack", joinColumns = [JoinColumn(name = "user_id")])
    @Column(name = "tech")
    var techStack: MutableList<String> = mutableListOf(),

    @ElementCollection
    @CollectionTable(name = "user_interests", joinColumns = [JoinColumn(name = "user_id")])
    @Column(name = "interest")
    var interests: MutableList<String> = mutableListOf(),

    @Enumerated(EnumType.STRING)
    val role: UserRole = UserRole.USER,

    /** Earned via posts, comments, questions, answers. See ReputationService. */
    @Column(nullable = false)
    var reputation: Int = 0,

    @CreationTimestamp
    val joinedAt: LocalDateTime? = null,   // nullable: existing rows may have NULL in DB

    // ── Notification prefs ────────────────────────────────────────────────
    var emailOnFollow:      Boolean = true,
    var emailOnPostLike:    Boolean = true,
    var emailOnPostComment: Boolean = true,
    var emailOnMessage:     Boolean = true,
    var emailOnHackathon:   Boolean = true,
    var emailOnWebinar:     Boolean = true,
    var emailOnQa:          Boolean = true,

    // ── Privacy ───────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    var profileVisibility: ProfileVisibility = ProfileVisibility.PUBLIC,
    @Enumerated(EnumType.STRING)
    var allowDms: AllowDms = AllowDms.EVERYONE,
    var showOnlineStatus: Boolean = true,
)

enum class UserRole { USER, ADMIN }