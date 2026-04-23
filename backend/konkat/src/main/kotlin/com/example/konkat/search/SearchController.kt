package com.example.konkat.search

import com.example.konkat.hackathon.HackathonRepository
import com.example.konkat.project.ProjectRepository
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import com.example.konkat.project.Project
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

// ── Result DTOs ───────────────────────────────────────────────────────────────

data class UserSearchResult(
    val id: Long,
    val name: String,
    val username: String?,
    val role: String?,       // job title
    val location: String?,
    val avatarUrl: String?,
)

data class ProjectSearchResult(
    val id: Long,
    val title: String,
    val description: String?,
    val ownerName: String,
    val techStack: List<String>,
    val status: String,
)

data class HackathonSearchResult(
    val id: Long,
    val title: String,
    val status: String,
    val location: String?,
)

data class SearchResultsDto(
    val users: List<UserSearchResult>,
    val projects: List<ProjectSearchResult>,
    val hackathons: List<HackathonSearchResult>,
)

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/search?q=diana
 *
 * Returns up to 5 users, 5 projects, and (stubbed) hackathons matching the query.
 * Minimum query length of 2 characters is enforced here to avoid full-table scans.
 */
@RestController
@RequestMapping("/api/search")
@Transactional
class SearchController(
    private val userRepository: UserRepository,
    private val projectRepository: ProjectRepository,
    private val hackathonRepository: HackathonRepository,
) {

    @GetMapping
    fun search(@RequestParam q: String): SearchResultsDto {
        val query = q.trim()

        // Require at least 2 characters to run a query
        if (query.length < 2) return SearchResultsDto(emptyList(), emptyList(), emptyList())

        val users = userRepository
            .findByDisplayNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(query, query)
            .take(5)
            .map { it.toSearchResult() }

        val projects = projectRepository
            .findByTitleContainingIgnoreCase(query)
            .take(5)
            .map { it.toSearchResult() }

        val hackathons = hackathonRepository
            .findByTitleContainingIgnoreCase(query)
            .take(5)
            .map { HackathonSearchResult(it.id, it.title, it.status.name, it.location) }

        return SearchResultsDto(users, projects, hackathons)
    }

    private fun User.toSearchResult() = UserSearchResult(
        id        = id,
        name      = displayName,
        username  = username,
        role      = title,
        location  = location,
        avatarUrl = avatarUrl,
    )

    private fun Project.toSearchResult() = ProjectSearchResult(
        id          = id,
        title       = title,
        description = description,
        ownerName   = owner.displayName,
        techStack   = techStack.toList(),
        status      = status.name,
    )
}
