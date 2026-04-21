package com.example.konkat.post

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface PostReactionRepository : JpaRepository<PostReaction, Long> {
    fun findByPostIdAndUserId(postId: Long, userId: Long): List<PostReaction>
    fun findByPostIdAndUserIdAndType(postId: Long, userId: Long, type: ReactionType): PostReaction?
    fun countByPostIdAndType(postId: Long, type: ReactionType): Long
    fun existsByPostIdAndUserIdAndType(postId: Long, userId: Long, type: ReactionType): Boolean
    fun deleteByPostIdAndUserIdAndType(postId: Long, userId: Long, type: ReactionType)
    fun findByUserIdAndType(userId: Long, type: ReactionType): List<PostReaction>
}
