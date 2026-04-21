package com.example.konkat.social

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

/**
 * Represents one user following another.
 *
 * Table: user_follows
 *
 * Example row:
 *   follower_id = 1 (Diana follows...)
 *   following_id = 2 (...John)
 *
 * The unique constraint prevents the same follow being inserted twice.
 * To get Diana's follower count:  SELECT COUNT(*) FROM user_follows WHERE following_id = 1
 * To get Diana's following count: SELECT COUNT(*) FROM user_follows WHERE follower_id  = 1
 */
@Entity
@Table(
    name = "user_follows",
    uniqueConstraints = [UniqueConstraint(columnNames = ["follower_id", "following_id"])]
)
class UserFollow(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** The user who pressed "Follow" */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", nullable = false)
    val follower: User,

    /** The user being followed */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "following_id", nullable = false)
    val following: User,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
