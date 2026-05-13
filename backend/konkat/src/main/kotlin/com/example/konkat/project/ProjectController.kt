package com.example.konkat.project

import com.example.konkat.config.PagedResponse
import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

// ── Request / Response DTOs ───────────────────────────────────────────────────

data class CreateProjectRequest(
    @field:jakarta.validation.constraints.NotBlank(message = "Title must not be blank")
    @field:jakarta.validation.constraints.Size(max = 200, message = "Title must be at most 200 characters")
    val title: String,
    @field:jakarta.validation.constraints.Size(max = 2000)
    val description: String?      = null,
    @field:jakarta.validation.constraints.Size(max = 500)
    val githubUrl: String?        = null,
    @field:jakarta.validation.constraints.Size(max = 500)
    val liveUrl: String?          = null,
    val imageUrl: String?         = null,
    val status: String            = "IN_PROGRESS",
    @field:jakarta.validation.constraints.Size(max = 20, message = "At most 20 tech stack entries allowed")
    val techStack: List<String>   = emptyList(),
)

data class ProjectDto(
    val id: Long,
    val title: String,
    val description: String?,
    val githubUrl: String?,
    val liveUrl: String?,
    val imageUrl: String?,
    val status: String,
    val techStack: List<String>,
    val ownerId: Long,
    val ownerName: String,
    val ownerRole: String?,
    val ownerAvatarUrl: String?,
    val createdAt: String,
)

// ── Controller ────────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/projects")
@Transactional
class ProjectController(
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
) {

    /**
     * GET /api/projects?page=0&size=20
     * Browse all projects, newest-first, with optional pagination.
     */
    @GetMapping
    fun getAllProjects(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): ResponseEntity<PagedResponse<ProjectDto>> {
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        return ResponseEntity.ok(
            PagedResponse.of(projectRepository.findAllByOrderByCreatedAtDesc(pageable).map { it.toDto() })
        )
    }

    /**
     * POST /api/projects
     * Creates a new project owned by the authenticated user.
     */
    @PostMapping
    fun createProject(
        @Valid @RequestBody body: CreateProjectRequest,
        request: HttpServletRequest,
    ): ResponseEntity<ProjectDto> {
        val userId = request.getAttribute("userId") as Long
        val owner  = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }

        val status = runCatching { ProjectStatus.valueOf(body.status) }
            .getOrDefault(ProjectStatus.IN_PROGRESS)

        val project = Project(
            owner       = owner,
            title       = body.title.trim(),
            description = body.description?.trim(),
            githubUrl   = body.githubUrl?.trim()?.ifBlank { null },
            liveUrl     = body.liveUrl?.trim()?.ifBlank { null },
            imageUrl    = body.imageUrl?.ifBlank { null },
            status      = status,
        ).also { it.techStack.addAll(body.techStack) }

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(projectRepository.save(project).toDto())
    }

    /**
     * GET /api/projects/me
     * Returns all projects owned by the authenticated user.
     */
    @GetMapping("/me")
    fun getMyProjects(request: HttpServletRequest): ResponseEntity<List<ProjectDto>> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(
            projectRepository.findByOwnerId(userId).map { it.toDto() }
        )
    }

    /**
     * GET /api/projects/user/:userId
     * Returns all projects owned by any user (public).
     */
    @GetMapping("/user/{userId}")
    fun getUserProjects(@PathVariable userId: Long): ResponseEntity<List<ProjectDto>> =
        ResponseEntity.ok(
            projectRepository.findByOwnerId(userId).map { it.toDto() }
        )

    /**
     * DELETE /api/projects/:id
     * Deletes a project — only the owner can do this.
     */
    @DeleteMapping("/{id}")
    fun deleteProject(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        val userId  = request.getAttribute("userId") as Long
        val project = projectRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        }
        if (project.owner.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete another user's project")
        projectRepository.delete(project)
        return ResponseEntity.noContent().build()
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun Project.toDto() = ProjectDto(
        id            = id,
        title         = title,
        description   = description,
        githubUrl     = githubUrl,
        liveUrl       = liveUrl,
        imageUrl      = imageUrl,
        status        = status.name,
        techStack     = techStack.toList(),
        ownerId       = owner.id,
        ownerName     = owner.displayName,
        ownerRole     = owner.title,
        ownerAvatarUrl = owner.avatarUrl,
        createdAt     = createdAt?.format(ISO) ?: "",
    )
}
