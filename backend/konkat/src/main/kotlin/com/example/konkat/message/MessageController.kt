package com.example.konkat.message

import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

private val TIME_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class MemberDto(val id: Long, val name: String, val role: String?, val avatarUrl: String?)

data class ConversationDto(
    val id: Long,
    val type: String,
    val name: String,
    val members: List<MemberDto>,
    val unreadCount: Long,
    val lastMessageContent: String?,
    val lastMessageAt: String?,
    val lastMessageSenderId: Long?,
)

data class MessageDto(
    val id: Long,
    val senderId: Long,
    val senderName: String,
    val content: String,
    val createdAt: String,
    val read: Boolean,
)

data class SendMessageRequest(val content: String)
data class CreateDmRequest(val userId: Long)
data class CreateGroupRequest(val name: String, val memberIds: List<Long>)

// ── Controller ────────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/messages")
@Transactional
class MessageController(
    private val userRepository: UserRepository,
    private val conversationRepository: ConversationRepository,
    private val messageRepository: MessageRepository,
    private val groupConversationRepository: GroupConversationRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val groupMessageRepository: GroupMessageRepository,
) {

    // ── GET /api/messages/conversations — all DM + group for current user ──────

    @GetMapping("/conversations")
    fun getConversations(request: HttpServletRequest): List<ConversationDto> {
        val userId = request.getAttribute("userId") as Long

        val dms = conversationRepository.findByParticipant(userId).map { c ->
            val other = if (c.participant1.id == userId) c.participant2 else c.participant1
            val last = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(c.id)
            val unread = messageRepository.countByConversationIdAndReadFalseAndSenderIdNot(c.id, userId)
            ConversationDto(
                id = c.id,
                type = "dm",
                name = other.displayName,
                members = listOf(MemberDto(other.id, other.displayName, other.title, other.avatarUrl)),
                unreadCount = unread,
                lastMessageContent = last?.content,
                lastMessageAt = last?.createdAt?.format(TIME_FMT),
                lastMessageSenderId = last?.sender?.id,
            )
        }

        val groups = groupMemberRepository.findByUserId(userId).map { gm ->
            val g = gm.group
            val members = groupMemberRepository.findByGroupId(g.id)
                .map { MemberDto(it.user.id, it.user.displayName, it.user.title, it.user.avatarUrl) }
            val last = groupMessageRepository.findTopByGroupIdOrderByCreatedAtDesc(g.id)
            ConversationDto(
                id = g.id,
                type = "group",
                name = g.name,
                members = members,
                unreadCount = 0,
                lastMessageContent = last?.content,
                lastMessageAt = last?.createdAt?.format(TIME_FMT),
                lastMessageSenderId = last?.sender?.id,
            )
        }

        return (dms + groups).sortedByDescending { it.lastMessageAt ?: "" }
    }

    // ── POST /api/messages/dm — get or create DM conversation ─────────────────

    @PostMapping("/dm")
    fun getOrCreateDm(
        @RequestBody body: CreateDmRequest,
        request: HttpServletRequest,
    ): ConversationDto {
        val userId = request.getAttribute("userId") as Long
        val me = userRepository.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        val other = userRepository.findById(body.userId).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }

        val p1Id = minOf(me.id, other.id)
        val p2Id = maxOf(me.id, other.id)
        val conv = conversationRepository.findByParticipant1IdAndParticipant2Id(p1Id, p2Id)
            ?: conversationRepository.save(
                Conversation(
                    participant1 = if (me.id <= other.id) me else other,
                    participant2 = if (me.id <= other.id) other else me,
                )
            )

        val unread = messageRepository.countByConversationIdAndReadFalseAndSenderIdNot(conv.id, userId)
        return ConversationDto(
            id = conv.id,
            type = "dm",
            name = other.displayName,
            members = listOf(MemberDto(other.id, other.displayName, other.title, other.avatarUrl)),
            unreadCount = unread,
            lastMessageContent = null,
            lastMessageAt = null,
            lastMessageSenderId = null,
        )
    }

    // ── GET /api/messages/dm/{id}/messages ─────────────────────────────────────

    @GetMapping("/dm/{id}/messages")
    fun getDmMessages(
        @PathVariable id: Long,
        @RequestParam(required = false) after: Long?,
        request: HttpServletRequest,
    ): List<MessageDto> {
        val userId = request.getAttribute("userId") as Long
        val conv = conversationRepository.findById(id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        if (conv.participant1.id != userId && conv.participant2.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN)

        val msgs = if (after != null && after > 0)
            messageRepository.findByConversationIdAndIdGreaterThanOrderByCreatedAtAsc(id, after)
        else
            messageRepository.findByConversationIdOrderByCreatedAtAsc(id)

        return msgs.map { it.toDto() }
    }

    // ── POST /api/messages/dm/{id}/messages ────────────────────────────────────

    @PostMapping("/dm/{id}/messages")
    fun sendDmMessage(
        @PathVariable id: Long,
        @RequestBody body: SendMessageRequest,
        request: HttpServletRequest,
    ): MessageDto {
        val userId = request.getAttribute("userId") as Long
        val me = userRepository.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        val conv = conversationRepository.findById(id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        if (conv.participant1.id != userId && conv.participant2.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN)

        return messageRepository.save(Message(conversation = conv, sender = me, content = body.content.trim())).toDto()
    }

    // ── PATCH /api/messages/dm/{id}/read ──────────────────────────────────────

    @PatchMapping("/dm/{id}/read")
    fun markDmRead(@PathVariable id: Long, request: HttpServletRequest): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        val conv = conversationRepository.findById(id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        if (conv.participant1.id != userId && conv.participant2.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN)

        messageRepository.findByConversationIdOrderByCreatedAtAsc(id)
            .filter { it.sender.id != userId && !it.read }
            .forEach { it.read = true }

        return ResponseEntity.noContent().build()
    }

    // ── POST /api/messages/group — create group ────────────────────────────────

    @PostMapping("/group")
    fun createGroup(
        @RequestBody body: CreateGroupRequest,
        request: HttpServletRequest,
    ): ConversationDto {
        val userId = request.getAttribute("userId") as Long
        val me = userRepository.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        val group = groupConversationRepository.save(GroupConversation(name = body.name.trim(), createdBy = me))

        val allIds = (body.memberIds + userId).distinct()
        val members = allIds.mapNotNull { uid ->
            val user = userRepository.findById(uid).orElse(null) ?: return@mapNotNull null
            groupMemberRepository.save(GroupMember(group = group, user = user))
        }

        return ConversationDto(
            id = group.id,
            type = "group",
            name = group.name,
            members = members.map { MemberDto(it.user.id, it.user.displayName, it.user.title, it.user.avatarUrl) },
            unreadCount = 0,
            lastMessageContent = null,
            lastMessageAt = null,
            lastMessageSenderId = null,
        )
    }

    // ── GET /api/messages/group/{id}/messages ──────────────────────────────────

    @GetMapping("/group/{id}/messages")
    fun getGroupMessages(
        @PathVariable id: Long,
        @RequestParam(required = false) after: Long?,
        request: HttpServletRequest,
    ): List<MessageDto> {
        val userId = request.getAttribute("userId") as Long
        if (!groupMemberRepository.existsByGroupIdAndUserId(id, userId))
            throw ResponseStatusException(HttpStatus.FORBIDDEN)

        val msgs = if (after != null && after > 0)
            groupMessageRepository.findByGroupIdAndIdGreaterThanOrderByCreatedAtAsc(id, after)
        else
            groupMessageRepository.findByGroupIdOrderByCreatedAtAsc(id)

        return msgs.map { it.toGroupDto() }
    }

    // ── POST /api/messages/group/{id}/messages ─────────────────────────────────

    @PostMapping("/group/{id}/messages")
    fun sendGroupMessage(
        @PathVariable id: Long,
        @RequestBody body: SendMessageRequest,
        request: HttpServletRequest,
    ): MessageDto {
        val userId = request.getAttribute("userId") as Long
        val me = userRepository.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        val group = groupConversationRepository.findById(id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND) }
        if (!groupMemberRepository.existsByGroupIdAndUserId(id, userId))
            throw ResponseStatusException(HttpStatus.FORBIDDEN)

        return groupMessageRepository.save(GroupMessage(group = group, sender = me, content = body.content.trim())).toGroupDto()
    }

    // ── PATCH /api/messages/group/{id}/read ───────────────────────────────────

    @PatchMapping("/group/{id}/read")
    fun markGroupRead(@PathVariable id: Long, request: HttpServletRequest): ResponseEntity<Void> {
        // Simplified: no per-user read tracking for groups yet
        return ResponseEntity.noContent().build()
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private fun Message.toDto() = MessageDto(
        id = id,
        senderId = sender.id,
        senderName = sender.displayName,
        content = content,
        createdAt = createdAt?.format(TIME_FMT) ?: "",
        read = read,
    )

    private fun GroupMessage.toGroupDto() = MessageDto(
        id = id,
        senderId = sender.id,
        senderName = sender.displayName,
        content = content,
        createdAt = createdAt?.format(TIME_FMT) ?: "",
        read = true,
    )
}
