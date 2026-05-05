package com.example.konkat.teampost

import com.example.konkat.hackathon.HackathonRepository
import com.example.konkat.message.GroupConversation
import com.example.konkat.message.GroupConversationRepository
import com.example.konkat.message.GroupMember
import com.example.konkat.message.GroupMemberRepository
import com.example.konkat.notification.NotificationSender
import com.example.konkat.notification.NotificationType
import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class TeamMemberDto(val id: Long, val name: String, val role: String?, val avatarUrl: String?)

data class HackathonRefDto(
    val id: Long, val title: String, val city: String?,
    val startDate: String?, val endDate: String?,
)

data class TeamPostDto(
    val id: Long,
    val hackathon: HackathonRefDto,
    val author: TeamMemberDto,
    val title: String,
    val description: String?,
    val techStack: List<String>,
    val location: String?,
    val maxMembers: Int,
    val members: List<TeamMemberDto>,
    val lookingFor: List<String>,
    val requestStatus: String,  // none | pending | approved | rejected | own
    val isOwn: Boolean,
    val createdAt: String,
    val groupConversationId: Long?,
)

data class TeamRequestDto(
    val id: Long,
    val requester: TeamMemberDto,
    val message: String?,
    val status: String,
    val createdAt: String,
)

data class CreateTeamPostRequest(
    val hackathonId: Long,
    val title: String,
    val description: String? = null,
    val techStack: List<String> = emptyList(),
    val location: String? = null,
    val maxMembers: Int = 4,
    val lookingFor: List<String> = emptyList(),
)

data class RequestJoinBody(val message: String? = null)

data class RespondBody(val approve: Boolean)

// ── Controller ────────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/team-posts")
@Transactional
class TeamPostController(
    private val teamPostRepository: TeamPostRepository,
    private val teamRequestRepository: TeamRequestRepository,
    private val hackathonRepository: HackathonRepository,
    private val userRepository: UserRepository,
    private val notificationSender: NotificationSender,
    private val groupConversationRepository: GroupConversationRepository,
    private val groupMemberRepository: GroupMemberRepository,
) {

    /** GET /api/team-posts — list all team posts, optionally filtered by hackathonId */
    @GetMapping
    fun getAll(
        @RequestParam(required = false) hackathonId: Long?,
        request: HttpServletRequest,
    ): ResponseEntity<List<TeamPostDto>> {
        val currentUserId = request.getAttribute("userId") as? Long
        val posts = if (hackathonId != null)
            teamPostRepository.findByHackathonIdOrderByCreatedAtDesc(hackathonId)
        else
            teamPostRepository.findAllByOrderByCreatedAtDesc()
        return ResponseEntity.ok(posts.map { it.toDto(currentUserId) })
    }

    /** POST /api/team-posts — create a team post */
    @PostMapping
    fun create(
        @RequestBody body: CreateTeamPostRequest,
        request: HttpServletRequest,
    ): ResponseEntity<TeamPostDto> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val author = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        val hackathon = hackathonRepository.findById(body.hackathonId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
        }
        val post = TeamPost(
            hackathon   = hackathon,
            author      = author,
            title       = body.title.trim(),
            description = body.description?.trim(),
            location    = body.location?.trim()?.ifBlank { null },
            maxMembers  = body.maxMembers.coerceIn(2, 10),
        ).also {
            it.techStack.addAll(body.techStack)
            it.lookingFor.addAll(body.lookingFor)
        }
        val saved = teamPostRepository.save(post)
        return ResponseEntity.status(HttpStatus.CREATED).body(saved.toDto(userId))
    }

    /** POST /api/team-posts/{id}/request — send a join request */
    @PostMapping("/{id}/request")
    fun requestJoin(
        @PathVariable id: Long,
        @RequestBody(required = false) body: RequestJoinBody?,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, String>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val post = teamPostRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Team post not found")
        }
        if (post.author.id == userId)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot request to join your own post")

        val existing = teamRequestRepository.findByTeamPostIdAndRequesterId(id, userId)
        if (existing != null)
            return ResponseEntity.ok(mapOf("status" to existing.status.name.lowercase()))

        val requester = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        teamRequestRepository.save(
            TeamRequest(teamPost = post, requester = requester, message = body?.message?.trim())
        )
        runCatching {
            notificationSender.send(
                recipient = post.author,
                actor     = requester,
                type      = NotificationType.TEAM_REQUEST,
            )
        }
        return ResponseEntity.ok(mapOf("status" to "pending"))
    }

    /** DELETE /api/team-posts/{id}/request — cancel a pending join request */
    @DeleteMapping("/{id}/request")
    fun cancelRequest(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, String>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val existing = teamRequestRepository.findByTeamPostIdAndRequesterId(id, userId)
            ?: return ResponseEntity.ok(mapOf("status" to "none"))
        if (existing.status != RequestStatus.PENDING)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending requests can be cancelled")
        teamRequestRepository.delete(existing)
        return ResponseEntity.ok(mapOf("status" to "none"))
    }

    /** GET /api/team-posts/{id}/requests — get join requests for a post (author only) */
    @GetMapping("/{id}/requests")
    fun getRequests(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<List<TeamRequestDto>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val post = teamPostRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Team post not found")
        }
        if (post.author.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can view requests")
        return ResponseEntity.ok(teamRequestRepository.findByTeamPostId(id).map { it.toDto() })
    }

    /** POST /api/team-posts/{id}/requests/{requestId}/respond — approve or reject */
    @PostMapping("/{id}/requests/{requestId}/respond")
    fun respond(
        @PathVariable id: Long,
        @PathVariable requestId: Long,
        @RequestBody body: RespondBody,
        request: HttpServletRequest,
    ): ResponseEntity<TeamRequestDto> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val post = teamPostRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Team post not found")
        }
        if (post.author.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can respond to requests")
        val req = teamRequestRepository.findById(requestId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found")
        }
        if (req.teamPost.id != id)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Request does not belong to this post")
        req.status = if (body.approve) RequestStatus.APPROVED else RequestStatus.REJECTED
        return ResponseEntity.ok(teamRequestRepository.save(req).toDto())
    }

    /** POST /api/team-posts/{id}/chat — get or create the team's group chat */
    @PostMapping("/{id}/chat")
    fun getOrCreateChat(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, Long>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val post = teamPostRepository.findByIdForUpdate(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Team post not found")
        }

        val isAuthor   = post.author.id == userId
        val isApproved = teamRequestRepository.findByTeamPostIdAndRequesterId(id, userId)
            ?.status == RequestStatus.APPROVED
        if (!isAuthor && !isApproved)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only team members can access the chat")

        // Return existing group chat if already created
        if (post.groupConversationId != null)
            return ResponseEntity.ok(mapOf("groupId" to post.groupConversationId!!))

        // Create a new group conversation named after the team post
        val author = userRepository.findById(post.author.id).orElseThrow()
        val group  = groupConversationRepository.save(GroupConversation(name = post.title, createdBy = author))

        // Add author + all approved members
        val approvedIds = teamRequestRepository
            .findByTeamPostIdAndStatus(id, RequestStatus.APPROVED)
            .map { it.requester.id }
        (listOf(post.author.id) + approvedIds).distinct().forEach { memberId ->
            val user = userRepository.findById(memberId).orElse(null) ?: return@forEach
            groupMemberRepository.save(GroupMember(group = group, user = user))
        }

        post.groupConversationId = group.id
        teamPostRepository.save(post)

        return ResponseEntity.ok(mapOf("groupId" to group.id))
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun TeamPost.toDto(currentUserId: Long?): TeamPostDto {
        val approvedMembers = teamRequestRepository
            .findByTeamPostIdAndStatus(id, RequestStatus.APPROVED)
            .map { TeamMemberDto(it.requester.id, it.requester.displayName, null, it.requester.avatarUrl) }
        val members = listOf(
            TeamMemberDto(author.id, author.displayName, null, author.avatarUrl)
        ) + approvedMembers

        val requestStatus = when {
            currentUserId == null                -> "none"
            author.id == currentUserId           -> "own"
            else -> teamRequestRepository
                .findByTeamPostIdAndRequesterId(id, currentUserId)
                ?.status?.name?.lowercase() ?: "none"
        }

        return TeamPostDto(
            id            = id,
            hackathon     = HackathonRefDto(
                id        = hackathon.id,
                title     = hackathon.title,
                city      = hackathon.location,
                startDate = hackathon.startDate?.format(ISO),
                endDate   = hackathon.endDate?.format(ISO),
            ),
            author        = TeamMemberDto(author.id, author.displayName, null, author.avatarUrl),
            title         = title,
            description   = description,
            techStack     = techStack.toList(),
            location      = location,
            maxMembers    = maxMembers,
            members       = members,
            lookingFor    = lookingFor.toList(),
            requestStatus       = requestStatus,
            isOwn               = currentUserId == author.id,
            createdAt           = createdAt?.format(ISO) ?: "",
            groupConversationId = groupConversationId,
        )
    }

    private fun TeamRequest.toDto() = TeamRequestDto(
        id        = id,
        requester = TeamMemberDto(requester.id, requester.displayName, null, requester.avatarUrl),
        message   = message,
        status    = status.name.lowercase(),
        createdAt = createdAt?.format(ISO) ?: "",
    )
}
