package com.example.konkat.message

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime

// ── Entities ──────────────────────────────────────────────────────────────────

@Entity
@Table(name = "group_conversations")
class GroupConversation(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    val name: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    val createdBy: User,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

@Entity
@Table(
    name = "group_members",
    uniqueConstraints = [UniqueConstraint(columnNames = ["group_id", "user_id"])]
)
class GroupMember(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    val group: GroupConversation,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
)

@Entity
@Table(name = "group_messages")
class GroupMessage(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    val group: GroupConversation,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    val sender: User,

    @Column(columnDefinition = "TEXT", nullable = false)
    val content: String,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

// ── Repositories ──────────────────────────────────────────────────────────────

interface GroupConversationRepository : JpaRepository<GroupConversation, Long>

interface GroupMemberRepository : JpaRepository<GroupMember, Long> {
    fun findByGroupId(groupId: Long): List<GroupMember>
    fun findByUserId(userId: Long): List<GroupMember>
    fun existsByGroupIdAndUserId(groupId: Long, userId: Long): Boolean
}

interface GroupMessageRepository : JpaRepository<GroupMessage, Long> {
    fun findByGroupIdOrderByCreatedAtAsc(groupId: Long): List<GroupMessage>
    fun findByGroupIdAndIdGreaterThanOrderByCreatedAtAsc(groupId: Long, afterId: Long): List<GroupMessage>
    fun findTopByGroupIdOrderByCreatedAtDesc(groupId: Long): GroupMessage?
}
