package com.example.konkat.post

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(
    name = "post_reactions",
    uniqueConstraints = [UniqueConstraint(columnNames = ["post_id", "user_id", "type"])]
)
data class PostReaction(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    val post: Post,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: ReactionType,

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now()
)

enum class ReactionType { LIKE, SAVE, SHARE }
