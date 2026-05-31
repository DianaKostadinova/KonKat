package com.example.konkat.post
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDateTime
import com.example.konkat.user.User

@Entity
@Table(name = "posts")
@SQLRestriction("deleted_at IS NULL")      // soft-delete: Hibernate auto-filters deleted rows
data class Post(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User,

    @Column(nullable = false, columnDefinition = "TEXT")
    var content: String,

    @Enumerated(EnumType.STRING)
    var type: PostType = PostType.TEXT,

    var codeLanguage: String? = null,

    @Column(columnDefinition = "TEXT")
    var codeSnippet: String? = null,

    @Column(columnDefinition = "TEXT")
    var imageUrl: String? = null,

    @ElementCollection
    @CollectionTable(name = "post_tags", joinColumns = [JoinColumn(name = "post_id")])
    @Column(name = "tag")
    var tags: MutableList<String> = mutableListOf(),

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now(),

    /** Soft delete timestamp — null means the post is active */
    var deletedAt: LocalDateTime? = null,

    /** Who deleted this post (user or admin) */
    var deletedById: Long? = null,
)

enum class PostType { TEXT, CODE, MEDIA }