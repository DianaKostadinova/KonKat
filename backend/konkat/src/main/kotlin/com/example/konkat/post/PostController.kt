package com.example.konkat.post

import com.example.konkat.config.PagedResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/posts")
class PostController(private val postService: PostService) {

    // ── Feed ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/posts
     * Returns full feed newest-first (no pagination — kept for backward compatibility).
     *
     * GET /api/posts?page=0&size=20
     * When page/size are provided, returns a PagedResponse envelope.
     */
    @GetMapping
    fun getFeed(
        @RequestParam(required = false) page: Int?,
        @RequestParam(required = false) size: Int?,
        @RequestParam(required = false) filter: String?,
        request: HttpServletRequest,
    ): ResponseEntity<*> {
        val userId = request.getAttribute("userId") as? Long
        val followingOnly = filter == "following" && userId != null
        return if (page != null || size != null) {
            if (followingOnly)
                ResponseEntity.ok(postService.getFollowingFeedPaged(userId!!, page ?: 0, size ?: 20))
            else
                ResponseEntity.ok(postService.getFeedPaged(userId, page ?: 0, size ?: 20))
        } else {
            if (followingOnly)
                ResponseEntity.ok(postService.getFollowingFeed(userId!!))
            else
                ResponseEntity.ok(postService.getFeed(userId))
        }
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
     * GET /api/posts/saved?page=0&size=20
     * Returns all posts saved by the currently authenticated user (paginated).
     */
    @GetMapping("/saved")
    fun getSaved(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        request: HttpServletRequest,
    ): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(postService.getSavedPosts(userId, page, size))
    }

    /**
     * GET /api/posts/tag/{tag}?page=0&size=20
     * Returns all posts that have the given tag, newest-first (paginated).
     */
    @GetMapping("/tag/{tag}")
    fun getByTag(
        @PathVariable tag: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        request: HttpServletRequest,
    ): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as? Long
        return ResponseEntity.ok(postService.getPostsByTag(tag, userId, page, size))
    }

    /**
     * GET /api/posts/user/{authorId}?page=0&size=20
     * Returns all posts by a specific user (paginated).
     */
    @GetMapping("/user/{authorId}")
    fun getByUser(
        @PathVariable authorId: Long,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        request: HttpServletRequest,
    ): ResponseEntity<List<PostDto>> {
        val userId = request.getAttribute("userId") as? Long
        return ResponseEntity.ok(postService.getPostsByUser(authorId, userId, page, size))
    }

    // ── Create / Delete ───────────────────────────────────────────────────────

    /**
     * POST /api/posts
     * Body: { content, type?, codeLanguage?, codeSnippet?, tags? }
     */
    @PostMapping
    fun createPost(
        @Valid @RequestBody body: CreatePostRequest,
        request: HttpServletRequest,
    ): ResponseEntity<PostDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(userId, body))
    }

    /**
     * PUT /api/posts/{id}
     * Body: { content?, codeLanguage?, codeSnippet?, tags? }
     * Only the post's author can edit. Sets `editedAt` on the post.
     */
    @PutMapping("/{id}")
    fun updatePost(
        @PathVariable id: Long,
        @Valid @RequestBody body: UpdatePostRequest,
        request: HttpServletRequest,
    ): ResponseEntity<PostDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(postService.updatePost(id, userId, body))
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

    // ── Comments (paginated) ─────────────────────────────────────────────────

    /**
     * GET /api/posts/{id}/comments?page=0&size=50
     * Returns comments for a post, oldest-first (paginated).
     */
    @GetMapping("/{id}/comments")
    fun getComments(
        @PathVariable id: Long,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
    ): ResponseEntity<List<PostCommentDto>> =
        ResponseEntity.ok(postService.getComments(id, page, size))

    /**
     * POST /api/posts/{id}/comments
     * Body: { text }
     */
    @PostMapping("/{id}/comments")
    fun addComment(
        @PathVariable id: Long,
        @Valid @RequestBody body: CreateCommentRequest,
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
