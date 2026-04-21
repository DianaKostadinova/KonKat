package com.example.konkat.post

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface PostRepository : JpaRepository<Post, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<Post>
    fun findByAuthorIdOrderByCreatedAtDesc(authorId: Long): List<Post>
    fun countByAuthorId(authorId: Long): Long
}