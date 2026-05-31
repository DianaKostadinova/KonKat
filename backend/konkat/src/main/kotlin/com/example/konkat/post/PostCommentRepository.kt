package com.example.konkat.post

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface PostCommentRepository : JpaRepository<PostComment, Long> {
    fun findByPostIdOrderByCreatedAtAsc(postId: Long): List<PostComment>
    fun findByPostIdOrderByCreatedAtAsc(postId: Long, pageable: Pageable): List<PostComment>
    fun countByPostId(postId: Long): Long
    fun deleteByPostIdAndAuthorId(postId: Long, authorId: Long)

    /** Batch: count comments per post for a list of post IDs */
    @Query(
        "SELECT c.post.id, COUNT(c) FROM PostComment c " +
        "WHERE c.post.id IN :postIds GROUP BY c.post.id"
    )
    fun countByPostIdIn(@Param("postIds") postIds: List<Long>): List<Array<Any>>
}

/** Helper: parse batch comment counts into postId → count */
fun List<Array<Any>>.toCommentCountMap(): Map<Long, Long> =
    associate { (it[0] as Long) to (it[1] as Long) }
