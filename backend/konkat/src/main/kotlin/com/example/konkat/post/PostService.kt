package com.example.konkat.post

import com.example.konkat.config.PagedResponse
import com.example.konkat.notification.NotificationSender
import com.example.konkat.notification.NotificationType
import com.example.konkat.social.FollowRepository
import com.example.konkat.user.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.transaction.annotation.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

@Service
@Transactional          // keeps the Hibernate session open for ALL methods —
                        // required because Post.author and Post.tags are lazy-loaded
class PostService(
    private val postRepository: PostRepository,
    private val postReactionRepository: PostReactionRepository,
    private val postCommentRepository: PostCommentRepository,
    private val userRepository: UserRepository,
    private val notificationSender: NotificationSender,
    private val followRepository: FollowRepository,
) {

    // ── Feed ──────────────────────────────────────────────────────────────────

    fun getFeed(currentUserId: Long?): List<PostDto> =
        postRepository.findAllByOrderByCreatedAtDesc().map { it.toDto(currentUserId) }

    fun getFeedPaged(currentUserId: Long?, page: Int, size: Int): PagedResponse<PostDto> {
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        val result   = postRepository.findAllByOrderByCreatedAtDesc(pageable)
        return PagedResponse.of(result.map { it.toDto(currentUserId) })
    }

    fun getFollowingFeed(currentUserId: Long): List<PostDto> {
        val followedIds = followRepository.findByFollowerId(currentUserId).map { it.following.id }
        if (followedIds.isEmpty()) return emptyList()
        return postRepository.findByAuthorIdInOrderByCreatedAtDesc(followedIds).map { it.toDto(currentUserId) }
    }

    fun getFollowingFeedPaged(currentUserId: Long, page: Int, size: Int): PagedResponse<PostDto> {
        val followedIds = followRepository.findByFollowerId(currentUserId).map { it.following.id }
        if (followedIds.isEmpty()) return PagedResponse(content = emptyList(), page = page, size = size, totalElements = 0, totalPages = 0, hasMore = false)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        val result   = postRepository.findByAuthorIdInOrderByCreatedAtDesc(followedIds, pageable)
        return PagedResponse.of(result.map { it.toDto(currentUserId) })
    }

    fun getPost(postId: Long, currentUserId: Long?): PostDto {
        val post = postRepository.findByIdOrNull(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
        return post.toDto(currentUserId, includeComments = true)
    }

    fun getPostsByUser(authorId: Long, currentUserId: Long?): List<PostDto> =
        postRepository.findByAuthorIdOrderByCreatedAtDesc(authorId).map { it.toDto(currentUserId) }

    fun getSavedPosts(userId: Long): List<PostDto> =
        postReactionRepository.findByUserIdAndType(userId, ReactionType.SAVE)
            .map { it.post.toDto(userId) }

    fun getPostsByTag(tag: String, currentUserId: Long?): List<PostDto> =
        postRepository.findByTagIgnoreCase("#${tag.trimStart('#')}").map { it.toDto(currentUserId) }

    fun getTrendingTags(): List<TrendingTagDto> =
        postRepository.findTrendingTags().map { row ->
            TrendingTagDto(tag = row.getTag(), postCount = row.getPostCount(), likeCount = row.getLikeCount())
        }

    // ── Create / Delete ───────────────────────────────────────────────────────

    fun createPost(authorId: Long, request: CreatePostRequest): PostDto {
        val author = userRepository.findByIdOrNull(authorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val post = Post(
            author = author,
            content = request.content,
            type = request.type,
            codeLanguage = request.codeLanguage,
            codeSnippet = request.codeSnippet,
            imageUrl = request.imageUrl,
            tags = request.tags.toMutableList(),
        )
        return postRepository.save(post).toDto(authorId)
    }

    @Transactional
    fun deletePost(postId: Long, requestingUserId: Long) {
        val post = postRepository.findByIdOrNull(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
        if (post.author.id != requestingUserId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete another user's post")
        postRepository.delete(post)
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    @Transactional
    fun toggleReaction(postId: Long, userId: Long, type: ReactionType): ReactionResultDto {
        val post = postRepository.findByIdOrNull(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
        val user = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")

        val existing = postReactionRepository.findByPostIdAndUserIdAndType(postId, userId, type)
        val active: Boolean
        if (existing != null) {
            postReactionRepository.delete(existing)
            active = false
        } else {
            postReactionRepository.save(PostReaction(post = post, user = user, type = type))
            active = true
        }

        // Notify post author when someone reacts (not on removal, not on self-reaction, not on SAVE)
        if (active && post.author.id != userId) {
            val notifType = when (type) {
                ReactionType.LIKE  -> NotificationType.POST_LIKE
                ReactionType.SHARE -> NotificationType.POST_SHARE
                else               -> null
            }
            if (notifType != null) {
                notificationSender.send(recipient = post.author, actor = user, type = notifType, postId = postId)
            }
        }

        return ReactionResultDto(
            type = type,
            active = active,
            count = postReactionRepository.countByPostIdAndType(postId, type),
        )
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    fun getComments(postId: Long): List<PostCommentDto> {
        if (!postRepository.existsById(postId))
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
        return postCommentRepository.findByPostIdOrderByCreatedAtAsc(postId).map { it.toDto() }
    }

    fun addComment(postId: Long, authorId: Long, request: CreateCommentRequest): PostCommentDto {
        val post = postRepository.findByIdOrNull(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
        val author = userRepository.findByIdOrNull(authorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val comment = postCommentRepository.save(PostComment(post = post, author = author, text = request.text))

        if (post.author.id != authorId) {
            notificationSender.send(recipient = post.author, actor = author, type = NotificationType.POST_COMMENT, postId = postId)
        }

        return comment.toDto()
    }

    @Transactional
    fun deleteComment(postId: Long, commentId: Long, requestingUserId: Long) {
        val comment = postCommentRepository.findByIdOrNull(commentId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found")
        if (comment.post.id != postId)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment does not belong to this post")
        if (comment.author.id != requestingUserId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete another user's comment")
        postCommentRepository.delete(comment)
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun Post.toDto(currentUserId: Long?, includeComments: Boolean = false): PostDto {
        val likes        = postReactionRepository.countByPostIdAndType(id, ReactionType.LIKE)
        val saves        = postReactionRepository.countByPostIdAndType(id, ReactionType.SAVE)
        val shares       = postReactionRepository.countByPostIdAndType(id, ReactionType.SHARE)
        val commentCount = postCommentRepository.countByPostId(id)
        val liked = currentUserId?.let {
            postReactionRepository.existsByPostIdAndUserIdAndType(id, it, ReactionType.LIKE)
        } ?: false
        val saved = currentUserId?.let {
            postReactionRepository.existsByPostIdAndUserIdAndType(id, it, ReactionType.SAVE)
        } ?: false
        val comments = if (includeComments)
            postCommentRepository.findByPostIdOrderByCreatedAtAsc(id).map { it.toDto() }
        else emptyList()

        return PostDto(
            id           = id,
            author       = author.toAuthorDto(),
            content      = content,
            type         = type,
            codeLanguage = codeLanguage,
            codeSnippet  = codeSnippet,
            imageUrl     = imageUrl,
            tags         = tags.toList(),
            reactions    = ReactionsDto(likes = likes, saves = saves, shares = shares),
            liked        = liked,
            saved        = saved,
            commentsCount = commentCount,
            comments     = comments,
            createdAt    = createdAt.format(ISO),
        )
    }

    private fun PostComment.toDto() = PostCommentDto(
        id        = id,
        author    = author.toAuthorDto(),
        text      = text,
        createdAt = createdAt.format(ISO),
    )
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class AuthorDto(
    val id: Long,
    val name: String,
    val username: String?,
    val avatarUrl: String?,
    val location: String?,
)

fun com.example.konkat.user.User.toAuthorDto() = AuthorDto(
    id        = id,
    name      = displayName,
    username  = username,
    avatarUrl = avatarUrl,
    location  = location,
)

data class ReactionsDto(
    val likes: Long,
    val saves: Long,
    val shares: Long,
)

data class PostDto(
    val id: Long,
    val author: AuthorDto,
    val content: String,
    val type: PostType,
    val codeLanguage: String?,
    val codeSnippet: String?,
    val imageUrl: String?,
    val tags: List<String>,
    val reactions: ReactionsDto,
    val liked: Boolean,
    val saved: Boolean,
    val commentsCount: Long,
    val comments: List<PostCommentDto>,
    val createdAt: String,          // ISO-8601 string — avoids Jackson version issues
)

data class PostCommentDto(
    val id: Long,
    val author: AuthorDto,
    val text: String,
    val createdAt: String,
)

data class ReactionResultDto(
    val type: ReactionType,
    val active: Boolean,
    val count: Long,
)

// ── Request bodies ────────────────────────────────────────────────────────────

data class CreatePostRequest(
    @field:jakarta.validation.constraints.NotBlank(message = "Content must not be blank")
    @field:jakarta.validation.constraints.Size(max = 5000, message = "Content must be at most 5000 characters")
    val content: String,
    val type: PostType = PostType.TEXT,
    @field:jakarta.validation.constraints.Size(max = 50, message = "Code language must be at most 50 characters")
    val codeLanguage: String? = null,
    @field:jakarta.validation.constraints.Size(max = 20000, message = "Code snippet must be at most 20000 characters")
    val codeSnippet: String? = null,
    val imageUrl: String? = null,
    @field:jakarta.validation.constraints.Size(max = 10, message = "At most 10 tags allowed")
    val tags: List<String> = emptyList(),
)

data class CreateCommentRequest(
    @field:jakarta.validation.constraints.NotBlank(message = "Comment text must not be blank")
    @field:jakarta.validation.constraints.Size(max = 2000, message = "Comment must be at most 2000 characters")
    val text: String,
)

data class TrendingTagDto(
    val tag: String,
    val postCount: Long,
    val likeCount: Long,
)
