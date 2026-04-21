package com.example.konkat.post

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface PostCommentRepository : JpaRepository<PostComment, Long> {
    fun findByPostIdOrderByCreatedAtAsc(postId: Long): List<PostComment>
    fun countByPostId(postId: Long): Long
    fun deleteByPostIdAndAuthorId(postId: Long, authorId: Long)
}
