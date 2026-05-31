package com.example.konkat.post

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface PostReactionRepository : JpaRepository<PostReaction, Long> {
    fun findByPostIdAndUserId(postId: Long, userId: Long): List<PostReaction>
    fun findByPostIdAndUserIdAndType(postId: Long, userId: Long, type: ReactionType): PostReaction?
    fun countByPostIdAndType(postId: Long, type: ReactionType): Long
    fun existsByPostIdAndUserIdAndType(postId: Long, userId: Long, type: ReactionType): Boolean
    fun deleteByPostIdAndUserIdAndType(postId: Long, userId: Long, type: ReactionType)
    fun findByUserIdAndType(userId: Long, type: ReactionType): List<PostReaction>

    /** Batch: count reactions per post+type for a list of post IDs */
    @Query(
        "SELECT r.post.id, r.type, COUNT(r) FROM PostReaction r " +
        "WHERE r.post.id IN :postIds GROUP BY r.post.id, r.type"
    )
    fun countByPostIdInGroupByType(@Param("postIds") postIds: List<Long>): List<Array<Any>>

    /** Batch: find which posts a user has reacted to with a given type */
    @Query(
        "SELECT r.post.id FROM PostReaction r " +
        "WHERE r.post.id IN :postIds AND r.user.id = :userId AND r.type = :type"
    )
    fun findReactedPostIds(
        @Param("postIds") postIds: List<Long>,
        @Param("userId") userId: Long,
        @Param("type") type: ReactionType,
    ): List<Long>
}

/** Helper: parse the batch count result into a map of postId → (type → count) */
fun List<Array<Any>>.toReactionCountMap(): Map<Long, Map<ReactionType, Long>> {
    val result = mutableMapOf<Long, MutableMap<ReactionType, Long>>()
    for (row in this) {
        val postId = row[0] as Long
        val type   = row[1] as ReactionType
        val count  = row[2] as Long
        result.getOrPut(postId) { mutableMapOf() }[type] = count
    }
    return result
}
