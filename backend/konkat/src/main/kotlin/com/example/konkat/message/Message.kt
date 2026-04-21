package com.example.konkat.message

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

// ── Conversation ──────────────────────────────────────────────────────────────

/**
 * A direct-message thread between exactly two users.
 *
 * Table: conversations
 *
 * Why participant1 / participant2 instead of a join table?
 * With only two participants it's simpler to query:
 *   "Find the conversation between user 1 and user 3" →
 *   WHERE (participant1_id=1 AND participant2_id=3)
 *      OR (participant1_id=3 AND participant2_id=1)
 *
 * The unique constraint on (participant1_id, participant2_id) prevents duplicates
 * only in one direction — the service must always store the lower ID in participant1
 * to guarantee uniqueness regardless of who initiates the chat.
 */
@Entity
@Table(
    name = "conversations",
    uniqueConstraints = [UniqueConstraint(columnNames = ["participant1_id", "participant2_id"])]
)
class Conversation(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** Always the user with the lower ID (enforced by service layer) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant1_id", nullable = false)
    val participant1: User,

    /** Always the user with the higher ID */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant2_id", nullable = false)
    val participant2: User,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

// ── Message ───────────────────────────────────────────────────────────────────

/**
 * A single message sent within a conversation.
 *
 * Table: messages
 *
 * To fetch a full conversation thread:
 *   SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
 *
 * To count unread messages for a user:
 *   SELECT COUNT(*) FROM messages m
 *   JOIN conversations c ON c.id = m.conversation_id
 *   WHERE (c.participant1_id = ? OR c.participant2_id = ?)
 *     AND m.sender_id != ?
 *     AND m.read = false
 */
@Entity
@Table(name = "messages")
class Message(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    val conversation: Conversation,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    val sender: User,

    @Column(columnDefinition = "TEXT", nullable = false)
    val content: String,

    /** Flipped to true when the other participant reads the message */
    var read: Boolean = false,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
