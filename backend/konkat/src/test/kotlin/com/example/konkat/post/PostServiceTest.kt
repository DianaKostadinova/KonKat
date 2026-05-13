package com.example.konkat.post

import com.example.konkat.notification.NotificationSender
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.Mockito.*
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.Optional
import kotlin.test.assertEquals

class PostServiceTest {

    private lateinit var postRepository: PostRepository
    private lateinit var postReactionRepository: PostReactionRepository
    private lateinit var postCommentRepository: PostCommentRepository
    private lateinit var userRepository: UserRepository
    private lateinit var notificationSender: NotificationSender
    private lateinit var service: PostService

    private fun makeUser(id: Long, email: String = "user$id@test.com"): User =
        User(id = id, email = email, displayName = "User $id")

    @BeforeEach
    fun setUp() {
        postRepository        = mock(PostRepository::class.java)
        postReactionRepository = mock(PostReactionRepository::class.java)
        postCommentRepository  = mock(PostCommentRepository::class.java)
        userRepository         = mock(UserRepository::class.java)
        notificationSender     = mock(NotificationSender::class.java)

        service = PostService(
            postRepository,
            postReactionRepository,
            postCommentRepository,
            userRepository,
            notificationSender,
        )
    }

    // ── deletePost ─────────────────────────────────────────────────────────

    @Test
    fun `deletePost throws FORBIDDEN when requester is not the author`() {
        val author = makeUser(1)
        val requester = makeUser(2)
        val post = Post(id = 10, author = author, content = "Hello", type = PostType.TEXT)

        `when`(postRepository.findById(10L)).thenReturn(Optional.of(post))

        val ex = assertThrows<ResponseStatusException> {
            service.deletePost(10L, requester.id)
        }

        assertEquals(HttpStatus.FORBIDDEN, ex.statusCode)
        verify(postRepository, never()).delete(any())
    }

    @Test
    fun `deletePost throws NOT_FOUND when post does not exist`() {
        `when`(postRepository.findById(99L)).thenReturn(Optional.empty())

        val ex = assertThrows<ResponseStatusException> {
            service.deletePost(99L, 1L)
        }

        assertEquals(HttpStatus.NOT_FOUND, ex.statusCode)
    }

    @Test
    fun `deletePost deletes the post when requester is the author`() {
        val author = makeUser(1)
        val post = Post(id = 5, author = author, content = "Mine", type = PostType.TEXT)

        `when`(postRepository.findById(5L)).thenReturn(Optional.of(post))

        service.deletePost(5L, author.id)

        verify(postRepository).delete(post)
    }

    // ── toggleReaction ─────────────────────────────────────────────────────

    @Test
    fun `toggleReaction creates reaction and returns active=true when none exists`() {
        val author = makeUser(1)
        val reactor = makeUser(2)
        val post = Post(id = 10, author = author, content = "Test", type = PostType.TEXT)

        `when`(postRepository.findById(10L)).thenReturn(Optional.of(post))
        `when`(userRepository.findById(2L)).thenReturn(Optional.of(reactor))
        `when`(postReactionRepository.findByPostIdAndUserIdAndType(10L, 2L, ReactionType.LIKE)).thenReturn(null)
        `when`(postReactionRepository.countByPostIdAndType(10L, ReactionType.LIKE)).thenReturn(1L)

        val result = service.toggleReaction(10L, reactor.id, ReactionType.LIKE)

        assertTrue(result.active)
        assertEquals(1L, result.count)
        assertEquals(ReactionType.LIKE, result.type)
        verify(postReactionRepository).save(any())
    }

    @Test
    fun `toggleReaction deletes existing reaction and returns active=false`() {
        val author = makeUser(1)
        val reactor = makeUser(2)
        val post = Post(id = 10, author = author, content = "Test", type = PostType.TEXT)
        val existing = PostReaction(post = post, user = reactor, type = ReactionType.LIKE)

        `when`(postRepository.findById(10L)).thenReturn(Optional.of(post))
        `when`(userRepository.findById(2L)).thenReturn(Optional.of(reactor))
        `when`(postReactionRepository.findByPostIdAndUserIdAndType(10L, 2L, ReactionType.LIKE)).thenReturn(existing)
        `when`(postReactionRepository.countByPostIdAndType(10L, ReactionType.LIKE)).thenReturn(0L)

        val result = service.toggleReaction(10L, reactor.id, ReactionType.LIKE)

        assertFalse(result.active)
        assertEquals(0L, result.count)
        verify(postReactionRepository).delete(existing)
        verify(postReactionRepository, never()).save(any())
    }

    @Test
    fun `toggleReaction sends notification to author when reactor is different user`() {
        val author = makeUser(1)
        val reactor = makeUser(2)
        val post = Post(id = 10, author = author, content = "Test", type = PostType.TEXT)

        `when`(postRepository.findById(10L)).thenReturn(Optional.of(post))
        `when`(userRepository.findById(2L)).thenReturn(Optional.of(reactor))
        `when`(postReactionRepository.findByPostIdAndUserIdAndType(10L, 2L, ReactionType.LIKE)).thenReturn(null)
        `when`(postReactionRepository.countByPostIdAndType(10L, ReactionType.LIKE)).thenReturn(1L)

        service.toggleReaction(10L, reactor.id, ReactionType.LIKE)

        verify(notificationSender).send(
            recipient   = author,
            actor       = reactor,
            type        = com.example.konkat.notification.NotificationType.POST_LIKE,
            postId      = 10L,
        )
    }

    @Test
    fun `toggleReaction does not notify when the author reacts to their own post`() {
        val author = makeUser(1)
        val post = Post(id = 10, author = author, content = "Mine", type = PostType.TEXT)

        `when`(postRepository.findById(10L)).thenReturn(Optional.of(post))
        `when`(userRepository.findById(1L)).thenReturn(Optional.of(author))
        `when`(postReactionRepository.findByPostIdAndUserIdAndType(10L, 1L, ReactionType.LIKE)).thenReturn(null)
        `when`(postReactionRepository.countByPostIdAndType(10L, ReactionType.LIKE)).thenReturn(1L)

        service.toggleReaction(10L, author.id, ReactionType.LIKE)

        verifyNoInteractions(notificationSender)
    }

    // ── getPostsByTag ──────────────────────────────────────────────────────

    @Test
    fun `getPostsByTag prepends # to tag without # prefix`() {
        `when`(postRepository.findByTagIgnoreCase("#angular")).thenReturn(emptyList())

        service.getPostsByTag("angular", null)

        verify(postRepository).findByTagIgnoreCase("#angular")
    }

    @Test
    fun `getPostsByTag strips extra # then prepends one`() {
        `when`(postRepository.findByTagIgnoreCase("#kotlin")).thenReturn(emptyList())

        service.getPostsByTag("#kotlin", null)

        verify(postRepository).findByTagIgnoreCase("#kotlin")
    }

    // ── addComment ─────────────────────────────────────────────────────────

    @Test
    fun `addComment throws NOT_FOUND when post does not exist`() {
        `when`(postRepository.findById(55L)).thenReturn(Optional.empty())

        val ex = assertThrows<ResponseStatusException> {
            service.addComment(55L, 1L, CreateCommentRequest("Nice"))
        }

        assertEquals(HttpStatus.NOT_FOUND, ex.statusCode)
    }

    @Test
    fun `deleteComment throws FORBIDDEN when requester is not the comment author`() {
        val commentAuthor = makeUser(1)
        val requester = makeUser(2)
        val postAuthor = makeUser(3)
        val post = Post(id = 10, author = postAuthor, content = "Post", type = PostType.TEXT)
        val comment = PostComment(id = 20, post = post, author = commentAuthor, text = "Hello")

        `when`(postCommentRepository.findById(20L)).thenReturn(Optional.of(comment))

        val ex = assertThrows<ResponseStatusException> {
            service.deleteComment(10L, 20L, requester.id)
        }

        assertEquals(HttpStatus.FORBIDDEN, ex.statusCode)
        verify(postCommentRepository, never()).delete(any())
    }
}
