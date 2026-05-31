package com.example.konkat.search

import com.example.konkat.hackathon.HackathonRepository
import com.example.konkat.post.Post
import com.example.konkat.post.PostRepository
import com.example.konkat.project.Project
import com.example.konkat.project.ProjectRepository
import com.example.konkat.qa.Question
import com.example.konkat.qa.QuestionRepository
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.springframework.data.domain.PageRequest
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
    val role: String?,
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

data class PostSearchResult(
    val id: Long,
    val content: String,
    val authorName: String,
    val authorAvatarUrl: String?,
    val tags: List<String>,
    val type: String,
    val createdAt: String,
)

data class QuestionSearchResult(
    val id: Long,
    val title: String,
    val authorName: String,
    val tags: List<String>,
    val solved: Boolean,
    val views: Long,
    val createdAt: String,
)

data class SearchResultsDto(
    val users: List<UserSearchResult>,
    val projects: List<ProjectSearchResult>,
    val hackathons: List<HackathonSearchResult>,
    val posts: List<PostSearchResult>,
    val questions: List<QuestionSearchResult>,
)

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/search?q=diana[&limit=20]
 *
 * Uses Postgres full-text search (tsvector + GIN indexes) for ranked results.
 * Falls back to ILIKE prefix matching for very short queries (2 chars).
 * limit defaults to 5 (navbar dropdown); pass limit=20 for the full search page.
 * Minimum query length of 2 characters is enforced to avoid full-table scans.
 */
@RestController
@RequestMapping("/api/search")
@Transactional(readOnly = true)
class SearchController(
    private val userRepository: UserRepository,
    private val projectRepository: ProjectRepository,
    private val hackathonRepository: HackathonRepository,
    private val postRepository: PostRepository,
    private val questionRepository: QuestionRepository,
) {

    @GetMapping
    fun search(
        @RequestParam q: String,
        @RequestParam(defaultValue = "5") limit: Int,
    ): SearchResultsDto {
        val query = q.trim()
        val cap   = limit.coerceIn(1, 50)

        if (query.length < 2) return SearchResultsDto(
            emptyList(), emptyList(), emptyList(), emptyList(), emptyList()
        )

        val pageable = PageRequest.of(0, cap)

        // Build a tsquery string: "word1:* & word2:*" for prefix matching
        val tsQuery = buildTsQuery(query)

        val users = userRepository
            .fullTextSearch(tsQuery, pageable)
            .map { it.toUserResult() }

        val projects = projectRepository
            .fullTextSearch(tsQuery, pageable)
            .map { it.toProjectResult() }

        val hackathons = hackathonRepository
            .fullTextSearch(tsQuery, pageable)
            .map { HackathonSearchResult(it.id, it.title, it.status.name, it.location) }

        val posts = postRepository
            .fullTextSearch(tsQuery, pageable)
            .map { it.toPostResult() }

        val questions = questionRepository
            .fullTextSearch(tsQuery, pageable)
            .map { it.toQuestionResult() }

        return SearchResultsDto(users, projects, hackathons, posts, questions)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Convert user input "hello world" → "hello:* & world:*"
     * so Postgres matches any word starting with each token.
     */
    private fun buildTsQuery(input: String): String =
        input.split(Regex("\\s+"))
            .filter { it.isNotBlank() }
            .joinToString(" & ") { "${sanitizeTsToken(it)}:*" }

    /** Strip characters that break to_tsquery syntax */
    private fun sanitizeTsToken(token: String): String =
        token.replace(Regex("[^a-zA-Z0-9@._-]"), "")
            .ifBlank { "x" }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private fun User.toUserResult() = UserSearchResult(
        id        = id,
        name      = displayName,
        username  = username,
        role      = title,
        location  = location,
        avatarUrl = avatarUrl,
    )

    private fun Project.toProjectResult() = ProjectSearchResult(
        id          = id,
        title       = title,
        description = description,
        ownerName   = owner.displayName,
        techStack   = techStack.toList(),
        status      = status.name,
    )

    private fun Post.toPostResult() = PostSearchResult(
        id              = id,
        content         = if (content.length > 200) content.take(200) + "…" else content,
        authorName      = author.displayName,
        authorAvatarUrl = author.avatarUrl,
        tags            = tags.toList(),
        type            = type.name,
        createdAt       = createdAt.toString(),
    )

    private fun Question.toQuestionResult() = QuestionSearchResult(
        id         = id,
        title      = title,
        authorName = author.displayName,
        tags       = tags.toList(),
        solved     = solved,
        views      = views,
        createdAt  = createdAt.toString(),
    )
}
