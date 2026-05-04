package com.example.konkat.post

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/posts")
class PostController(private val postService: PostService) {

    // ── Feed ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/posts
     * Returns full feed newest-first.
     * Auth optional — liked/saved flags are false when unauthenticated.
     */
    @GetMapping
    fun getFeed(request: HttpServletRequest): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as? Long
        return ResponseEntity.ok(postService.getFeed(userId))
    }

    /**
     * GET /api/posts/{id}
     * Returns a single post with all its comments.
     */
    @GetMapping("/{id}")
    fun getPost(@PathVariable id: Long, request: HttpServletRequest): ResponseEntity<PostDto> {
        val userId = request.getAttribute("userId") as? Long
        return ResponseEntity.ok(postService.getPost(id, userId))
    }

    /**
     * GET /api/posts/saved
     * Returns all posts saved by the currently authenticated user.
     */
    @GetMapping("/saved")
    fun getSaved(request: HttpServletRequest): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(postService.getSavedPosts(userId))
    }

    /**
     * GET /api/posts/tag/{tag}
     * Returns all posts that have the given tag, newest-first.
     */
    @GetMapping("/tag/{tag}")
    fun getByTag(
        @PathVariable tag: String,
        request: HttpServletRequest,
    ): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as? Long
        return ResponseEntity.ok(postService.getPostsByTag(tag, userId))
    }

    /**
     * GET /api/posts/user/{authorId}
     * Returns all posts by a specific user.
     */
    @GetMapping("/user/{authorId}")
    fun getByUser(
        @PathVariable authorId: Long,
        request: HttpServletRequest,
    ): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as? Long
        return ResponseEntity.ok(postService.getPostsByUser(authorId, userId))
    }

    // ── Create / Delete ───────────────────────────────────────────────────────

    /**
     * POST /api/posts
     * Body: { content, type?, codeLanguage?, codeSnippet?, tags? }
     */
    @PostMapping
    fun createPost(
        @RequestBody body: CreatePostRequest,
        request: HttpServletRequest,
    ): ResponseEntity<PostDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(userId, body))
    }

    /**
     * DELETE /api/posts/{id}
     * Only the post's author can delete it.
     */
    @DeleteMapping("/{id}")
    fun deletePost(@PathVariable id: Long, request: HttpServletRequest): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        postService.deletePost(id, userId)
        return ResponseEntity.noContent().build()
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    /**
     * POST /api/posts/{id}/react
     * Body: { type: "LIKE" | "SAVE" | "SHARE" }
     * Toggles the reaction on/off. Returns new state + count.
     */
    @PostMapping("/{id}/react")
    fun toggleReaction(
        @PathVariable id: Long,
        @RequestBody body: ReactRequest,
        request: HttpServletRequest,
    ): ResponseEntity<ReactionResultDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(postService.toggleReaction(id, userId, body.type))
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    /**
     * GET /api/posts/{id}/comments
     * Returns all comments for a post, oldest-first.
     */
    @GetMapping("/{id}/comments")
    fun getComments(@PathVariable id: Long): ResponseEntity<List<PostCommentDto>> =
        ResponseEntity.ok(postService.getComments(id))

    /**
     * POST /api/posts/{id}/comments
     * Body: { text }
     */
    @PostMapping("/{id}/comments")
    fun addComment(
        @PathVariable id: Long,
        @RequestBody body: CreateCommentRequest,
        request: HttpServletRequest,
    ): ResponseEntity<PostCommentDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.addComment(id, userId, body))
    }

    /**
     * DELETE /api/posts/{postId}/comments/{commentId}
     * Only the comment's author can delete it.
     */
    @DeleteMapping("/{postId}/comments/{commentId}")
    fun deleteComment(
        @PathVariable postId: Long,
        @PathVariable commentId: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        postService.deleteComment(postId, commentId, userId)
        return ResponseEntity.noContent().build()
    }
}

data class ReactRequest(val type: ReactionType)
