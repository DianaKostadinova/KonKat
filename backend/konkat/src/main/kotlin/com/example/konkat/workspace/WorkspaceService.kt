package com.example.konkat.workspace

import com.example.konkat.hackathon.Hackathon
import com.example.konkat.teampost.RequestStatus
import com.example.konkat.teampost.TeamPostRepository
import com.example.konkat.teampost.TeamRequestRepository
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")

@Service
@Transactional
class WorkspaceService(
    private val workspaceRepository: WorkspaceRepository,
    private val memberRepository: WorkspaceMemberRepository,
    private val taskRepository: WorkspaceTaskRepository,
    private val messageRepository: WorkspaceMessageRepository,
    private val userRepository: UserRepository,
    private val teamPostRepository: TeamPostRepository,
    private val teamRequestRepository: TeamRequestRepository,
) {

    // ── List ──────────────────────────────────────────────────────────────────

    fun getMyWorkspaces(userId: Long): List<WorkspaceSummaryDto> =
        memberRepository.findByUserId(userId).map { it.workspace.toSummaryDto() }

    // ── Detail ────────────────────────────────────────────────────────────────

    fun getWorkspace(workspaceId: Long, userId: Long): WorkspaceDto {
        val ws = requireMember(workspaceId, userId)
        return ws.toDto()
    }

    // ── Create ────────────────────────────────────────────────────────────────

    fun create(userId: Long, name: String): WorkspaceSummaryDto {
        val user = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val ws = workspaceRepository.save(Workspace(name = name.trim(), createdBy = user))
        memberRepository.save(WorkspaceMember(workspace = ws, user = user))
        return ws.toSummaryDto()
    }

    /** Called when a team member clicks "Open Workspace" on a Find-Team post. */
    fun getOrCreateFromTeamPost(teamPostId: Long, userId: Long): WorkspaceSummaryDto {
        val post = teamPostRepository.findByIdOrNull(teamPostId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Team post not found")

        val isAuthor   = post.author.id == userId
        val isApproved = teamRequestRepository
            .findByTeamPostIdAndRequesterId(teamPostId, userId)
            ?.status == RequestStatus.APPROVED
        if (!isAuthor && !isApproved)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only team members can open the workspace")

        // Reuse existing workspace if already created for this team post
        val existing = workspaceRepository.findByTeamPostId(teamPostId)
        if (existing != null) {
            // Ensure the calling user is a member (they may have been added after creation)
            if (!memberRepository.existsByWorkspaceIdAndUserId(existing.id, userId)) {
                val user = userRepository.findByIdOrNull(userId)
                    ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
                memberRepository.save(WorkspaceMember(workspace = existing, user = user))
            }
            return existing.toSummaryDto()
        }

        // Create new workspace named after the team post
        val creator = userRepository.findByIdOrNull(post.author.id)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Author not found")
        val ws = workspaceRepository.save(
            Workspace(name = post.title, createdBy = creator, teamPostId = teamPostId)
        )

        // Add author + all approved members
        val approvedIds = teamRequestRepository
            .findByTeamPostIdAndStatus(teamPostId, RequestStatus.APPROVED)
            .map { it.requester.id }
        (listOf(post.author.id) + approvedIds).distinct().forEach { memberId ->
            val user = userRepository.findByIdOrNull(memberId) ?: return@forEach
            memberRepository.save(WorkspaceMember(workspace = ws, user = user))
        }

        return ws.toSummaryDto()
    }

    /** Called by HackathonController when registering with a teamName. */
    fun getOrCreateHackathonWorkspace(hackathon: Hackathon, user: User, teamName: String, role: String?) {
        val ws = workspaceRepository.findByHackathonIdAndTeamName(hackathon.id, teamName)
            ?: workspaceRepository.save(
                Workspace(name = teamName, createdBy = user, hackathon = hackathon, teamName = teamName)
            )
        if (!memberRepository.existsByWorkspaceIdAndUserId(ws.id, user.id)) {
            memberRepository.save(WorkspaceMember(workspace = ws, user = user, role = role))
        }
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────

    fun addTask(workspaceId: Long, userId: Long, req: CreateTaskRequest): WorkspaceTaskDto {
        val ws = requireMember(workspaceId, userId)
        val task = taskRepository.save(
            WorkspaceTask(
                workspace   = ws,
                title       = req.title.trim(),
                description = req.description?.trim(),
                assignee    = req.assignee?.trim(),
                priority    = runCatching { TaskPriority.valueOf(req.priority.uppercase()) }.getOrDefault(TaskPriority.MEDIUM),
            )
        )
        return task.toDto()
    }

    fun updateTask(workspaceId: Long, taskId: Long, userId: Long, req: UpdateTaskRequest): WorkspaceTaskDto {
        requireMember(workspaceId, userId)
        val task = taskRepository.findByIdOrNull(taskId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found")
        if (task.workspace.id != workspaceId)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task does not belong to this workspace")

        req.status?.let   { task.status   = runCatching { TaskStatus.valueOf(it.uppercase()) }.getOrDefault(task.status) }
        req.priority?.let { task.priority = runCatching { TaskPriority.valueOf(it.uppercase()) }.getOrDefault(task.priority) }
        req.title?.let    { task.title    = it.trim() }

        return taskRepository.save(task).toDto()
    }

    fun deleteTask(workspaceId: Long, taskId: Long, userId: Long) {
        requireMember(workspaceId, userId)
        val task = taskRepository.findByIdOrNull(taskId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found")
        if (task.workspace.id != workspaceId)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task does not belong to this workspace")
        taskRepository.delete(task)
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    fun getMessages(workspaceId: Long, userId: Long): List<WorkspaceMessageDto> {
        requireMember(workspaceId, userId)
        return messageRepository.findTop50ByWorkspaceIdOrderByCreatedAtAsc(workspaceId).map { it.toDto() }
    }

    fun sendMessage(workspaceId: Long, userId: Long, content: String): WorkspaceMessageDto {
        val ws = requireMember(workspaceId, userId)
        val sender = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val msg = messageRepository.save(WorkspaceMessage(workspace = ws, sender = sender, content = content.trim()))
        return msg.toDto()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun requireMember(workspaceId: Long, userId: Long): Workspace {
        val ws = workspaceRepository.findByIdOrNull(workspaceId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found")
        if (!memberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId))
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a member of this workspace")
        return ws
    }

    private fun Workspace.toSummaryDto() = WorkspaceSummaryDto(
        id             = id,
        name           = name,
        hackathonTitle = hackathon?.title,
        memberCount    = memberRepository.findByWorkspaceId(id).size,
        taskCount      = taskRepository.countByWorkspaceId(id).toInt(),
        doneCount      = taskRepository.countByWorkspaceIdAndStatus(id, TaskStatus.DONE).toInt(),
    )

    private fun Workspace.toDto() = WorkspaceDto(
        id             = id,
        name           = name,
        hackathonTitle = hackathon?.title,
        hackathonId    = hackathon?.id,
        members        = memberRepository.findByWorkspaceId(id).map { m ->
            WorkspaceMemberDto(userId = m.user.id, name = m.user.displayName, role = m.role, avatarUrl = m.user.avatarUrl)
        },
        tasks          = taskRepository.findByWorkspaceIdOrderByCreatedAtAsc(id).map { it.toDto() },
    )

    private fun WorkspaceTask.toDto() = WorkspaceTaskDto(
        id          = id,
        title       = title,
        description = description,
        assignee    = assignee,
        priority    = priority.name.lowercase(),
        status      = status.name.lowercase(),
        createdAt   = createdAt.format(ISO),
    )

    private fun WorkspaceMessage.toDto() = WorkspaceMessageDto(
        id         = id,
        senderId   = sender.id,
        senderName = sender.displayName,
        content    = content,
        createdAt  = createdAt.format(ISO),
    )
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class WorkspaceSummaryDto(
    val id: Long, val name: String, val hackathonTitle: String?,
    val memberCount: Int, val taskCount: Int, val doneCount: Int,
)

data class WorkspaceDto(
    val id: Long, val name: String,
    val hackathonTitle: String?, val hackathonId: Long?,
    val members: List<WorkspaceMemberDto>,
    val tasks: List<WorkspaceTaskDto>,
)

data class WorkspaceMemberDto(val userId: Long, val name: String, val role: String?, val avatarUrl: String?)

data class WorkspaceTaskDto(
    val id: Long, val title: String, val description: String?,
    val assignee: String?, val priority: String, val status: String, val createdAt: String,
)

data class WorkspaceMessageDto(
    val id: Long, val senderId: Long, val senderName: String, val content: String, val createdAt: String,
)

// ── Request bodies ────────────────────────────────────────────────────────────

data class CreateWorkspaceRequest(val name: String)
data class CreateTaskRequest(val title: String, val description: String? = null, val priority: String = "MEDIUM", val assignee: String? = null)
data class UpdateTaskRequest(val status: String? = null, val priority: String? = null, val title: String? = null)
data class SendMessageRequest(val content: String)
