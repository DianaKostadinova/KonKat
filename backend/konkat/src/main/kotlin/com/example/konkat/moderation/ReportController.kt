package com.example.konkat.moderation

import com.example.konkat.config.PagedResponse
import com.example.konkat.user.UserRepository
import com.example.konkat.user.UserRole
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")

// ── DTOs ─────────────────────────────────────────────────────────────────────

data class CreateReportRequest(
    @field:jakarta.validation.constraints.NotNull(message = "Target type is required")
    val targetType: ReportTargetType,

    val targetId: Long,

    @field:jakarta.validation.constraints.NotNull(message = "Reason is required")
    val reason: ReportReason,

    @field:jakarta.validation.constraints.Size(max = 2000, message = "Description must be at most 2000 characters")
    val description: String? = null,
)

data class ReviewReportRequest(
    @field:jakarta.validation.constraints.NotNull(message = "Status is required")
    val status: ReportStatus,

    @field:jakarta.validation.constraints.Size(max = 2000)
    val moderatorNotes: String? = null,
)

data class ReportDto(
    val id: Long,
    val reporterId: Long,
    val reporterName: String,
    val targetType: String,
    val targetId: Long,
    val reason: String,
    val description: String?,
    val status: String,
    val reportCount: Long,
    val reviewedByName: String?,
    val moderatorNotes: String?,
    val createdAt: String,
    val reviewedAt: String?,
)

// ── Controller ───────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/reports")
@Transactional
class ReportController(
    private val reportRepository: ReportRepository,
    private val userRepository: UserRepository,
) {

    /**
     * POST /api/reports
     * Submit a report against a post, comment, question, answer, user, or message.
     * One report per (reporter, targetType, targetId) — idempotent.
     */
    @PostMapping
    fun createReport(
        @Valid @RequestBody body: CreateReportRequest,
        request: HttpServletRequest,
    ): ResponseEntity<ReportDto> {
        val userId = request.getAttribute("userId") as? Long
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val reporter = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")

        // Prevent self-reporting
        if (body.targetType == ReportTargetType.USER && body.targetId == userId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot report yourself")
        }

        // Idempotent: if already reported, just return the existing count
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(userId, body.targetType, body.targetId)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "You have already reported this content")
        }

        val report = reportRepository.save(
            Report(
                reporter    = reporter,
                targetType  = body.targetType,
                targetId    = body.targetId,
                reason      = body.reason,
                description = body.description?.trim(),
            )
        )

        val count = reportRepository.countByTargetTypeAndTargetId(body.targetType, body.targetId)
        return ResponseEntity.status(HttpStatus.CREATED).body(report.toDto(count))
    }

    /**
     * GET /api/reports?status=PENDING&page=0&size=20
     * Admin-only: list reports filtered by status (or all).
     */
    @GetMapping
    fun listReports(
        @RequestParam(required = false) status: ReportStatus?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        request: HttpServletRequest,
    ): ResponseEntity<PagedResponse<ReportDto>> {
        requireAdmin(request)
        val pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 100), Sort.by(Sort.Direction.DESC, "createdAt"))
        val result = if (status != null) {
            reportRepository.findByStatus(status, pageable)
        } else {
            reportRepository.findAllByOrderByCreatedAtDesc(pageable)
        }
        return ResponseEntity.ok(PagedResponse.of(result.map { r ->
            val count = reportRepository.countByTargetTypeAndTargetId(r.targetType, r.targetId)
            r.toDto(count)
        }))
    }

    /**
     * GET /api/reports/stats
     * Admin-only: quick counts by status.
     */
    @GetMapping("/stats")
    fun getStats(request: HttpServletRequest): ResponseEntity<Map<String, Long>> {
        requireAdmin(request)
        return ResponseEntity.ok(
            ReportStatus.entries.associate { it.name to reportRepository.countByStatus(it) }
        )
    }

    /**
     * PUT /api/reports/{id}/review
     * Admin-only: review a report (change status, add moderator notes).
     */
    @PutMapping("/{id}/review")
    fun reviewReport(
        @PathVariable id: Long,
        @Valid @RequestBody body: ReviewReportRequest,
        request: HttpServletRequest,
    ): ResponseEntity<ReportDto> {
        val adminId = requireAdmin(request)
        val admin = userRepository.findByIdOrNull(adminId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)

        val report = reportRepository.findByIdOrNull(id)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found")

        report.status         = body.status
        report.moderatorNotes = body.moderatorNotes?.trim()
        report.reviewedBy     = admin
        report.reviewedAt     = LocalDateTime.now()

        val saved = reportRepository.save(report)
        val count = reportRepository.countByTargetTypeAndTargetId(report.targetType, report.targetId)
        return ResponseEntity.ok(saved.toDto(count))
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private fun requireAdmin(request: HttpServletRequest): Long {
        val userId = request.getAttribute("userId") as? Long
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val user = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
        if (user.role != UserRole.ADMIN) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required")
        }
        return userId
    }

    private fun Report.toDto(reportCount: Long) = ReportDto(
        id             = id,
        reporterId     = reporter.id,
        reporterName   = reporter.displayName,
        targetType     = targetType.name,
        targetId       = targetId,
        reason         = reason.name,
        description    = description,
        status         = status.name,
        reportCount    = reportCount,
        reviewedByName = reviewedBy?.displayName,
        moderatorNotes = moderatorNotes,
        createdAt      = createdAt?.format(ISO) ?: "",
        reviewedAt     = reviewedAt?.format(ISO),
    )
}
