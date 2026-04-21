package com.example.konkat.project

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

// ── Status of a project ───────────────────────────────────────────────────────

enum class ProjectStatus {
    IN_PROGRESS,        // actively being built
    COMPLETED,          // shipped / finished
    LOOKING_FOR_TEAM,   // owner wants collaborators
    ARCHIVED,           // no longer active
}

// ── Project ───────────────────────────────────────────────────────────────────

/**
 * A portfolio project created by a user.
 *
 * Table: projects
 *
 * One user can own many projects (one-to-many from User side).
 * Tech stack is stored in a separate collection table (same pattern as User.techStack).
 */
@Entity
@Table(name = "projects")
class Project(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** The user who created/owns this project */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    val owner: User,

    @Column(nullable = false)
    var title: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    var githubUrl: String? = null,
    var liveUrl: String? = null,

    /** Optional thumbnail / screenshot */
    @Column(columnDefinition = "TEXT")
    var imageUrl: String? = null,

    @Enumerated(EnumType.STRING)
    var status: ProjectStatus = ProjectStatus.IN_PROGRESS,

    /**
     * Technologies used in this project.
     * Stored in a separate table: project_tech_stack(project_id, tech)
     * Same pattern as user_tech_stack on the User entity.
     */
    @ElementCollection
    @CollectionTable(name = "project_tech_stack", joinColumns = [JoinColumn(name = "project_id")])
    @Column(name = "tech")
    var techStack: MutableList<String> = mutableListOf(),

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

// ── Project members ───────────────────────────────────────────────────────────

/**
 * A user collaborating on someone else's project.
 *
 * Table: project_members
 *
 * Example: John (user_id=2) is a "Frontend Developer" on Diana's project (project_id=5).
 * The unique constraint means each user can only appear once per project.
 */
@Entity
@Table(
    name = "project_members",
    uniqueConstraints = [UniqueConstraint(columnNames = ["project_id", "user_id"])]
)
class ProjectMember(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    val project: Project,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    /** What this member does on the project, e.g. "Frontend", "Backend", "Design" */
    var role: String? = null,

    @CreationTimestamp
    val joinedAt: LocalDateTime? = null,
)

// ── Project reactions ─────────────────────────────────────────────────────────

enum class ProjectReactionType { LIKE, SAVE }

/**
 * A like or save on a project.
 *
 * Table: project_reactions
 *
 * Mirrors post_reactions exactly — same toggle logic will apply.
 * Unique constraint prevents double-liking.
 */
@Entity
@Table(
    name = "project_reactions",
    uniqueConstraints = [UniqueConstraint(columnNames = ["project_id", "user_id", "type"])]
)
class ProjectReaction(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    val project: Project,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    val type: ProjectReactionType,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
