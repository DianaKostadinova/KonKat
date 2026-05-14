package com.example.konkat.post

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface PostRepository : JpaRepository<Post, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<Post>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Post>
    fun findByAuthorIdOrderByCreatedAtDesc(authorId: Long): List<Post>
    fun countByAuthorId(authorId: Long): Long

    fun findByContentContainingIgnoreCaseOrderByCreatedAtDesc(content: String): List<Post>

    @Query("SELECT p FROM Post p JOIN p.tags t WHERE LOWER(t) = LOWER(:tag) ORDER BY p.createdAt DESC")
    fun findByTagIgnoreCase(@Param("tag") tag: String): List<Post>

    @Query(
        value = """
            SELECT pt.tag AS tag,
                   COUNT(DISTINCT pt.post_id) AS postCount,
                   COUNT(pr.id) AS likeCount
            FROM post_tags pt
            LEFT JOIN post_reactions pr ON pr.post_id = pt.post_id AND pr.type = 'LIKE'
            GROUP BY pt.tag
            ORDER BY COUNT(pr.id) DESC, COUNT(DISTINCT pt.post_id) DESC
            LIMIT 10
        """,
        nativeQuery = true
    )
    fun findTrendingTags(): List<TrendingTagProjection>
}

interface TrendingTagProjection {
    fun getTag(): String
    fun getPostCount(): Long
    fun getLikeCount(): Long
}