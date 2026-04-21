package com.example.konkat.post

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "post_comments")
data class PostComment(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    val post: Post,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User,

    @Column(nullable = false, columnDefinition = "TEXT")
    var text: String,

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now()
)
