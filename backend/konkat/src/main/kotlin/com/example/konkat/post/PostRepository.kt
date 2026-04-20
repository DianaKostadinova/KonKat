package com.example.konkat.post

@Repository
interface PostRepository : JpaRepository<Post, Long> {
    fun findByAuthorIdOrderByCreatedAtDesc(authorId: Long): List<Post>
    fun findAllByOrderByCreatedAtDesc(): List<Post>
}