package com.example.konkat.moderation

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

/**
 * The type of content being reported.
 */
enum class ReportTargetType {
    POST,
    COMMENT,
    QUESTION,
    ANSWER,
    USER,
    MESSAGE,
}

/**
 * Why the content is being reported.
 */
enum class ReportReason {
    SPAM,
    HARASSMENT,
    HATE_SPEECH,
    MISINFORMATION,
    INAPPROPRIATE,
    COPYRIGHT,
    OTHER,
}

/**
 * Current status of a report.
 */
enum class ReportStatus {
    PENDING,
    REVIEWED,
    ACTION_TAKEN,
    DISMISSED,
}

/**
 * A user-submitted report against a piece of content or another user.
 */
@Entity
@Table(
    name = "reports",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["reporter_id", "target_type", "target_id"])
    ],
)
class Report(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** Who filed the report */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    val reporter: User,

    /** What kind of content */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    val targetType: ReportTargetType,

    /** ID of the reported entity (post, comment, user, etc.) */
    @Column(name = "target_id", nullable = false)
    val targetId: Long,

    /** Why they're reporting it */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val reason: ReportReason,

    /** Free-text description (optional) */
    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    /** Current moderation status */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: ReportStatus = ReportStatus.PENDING,

    /** Admin who reviewed it (if any) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    var reviewedBy: User? = null,

    /** Admin notes */
    @Column(columnDefinition = "TEXT")
    var moderatorNotes: String? = null,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,

    var reviewedAt: LocalDateTime? = null,
)
