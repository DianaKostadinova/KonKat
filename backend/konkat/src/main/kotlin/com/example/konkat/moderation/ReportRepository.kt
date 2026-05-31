package com.example.konkat.moderation

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ReportRepository : JpaRepository<Report, Long> {
    fun existsByReporterIdAndTargetTypeAndTargetId(
        reporterId: Long,
        targetType: ReportTargetType,
        targetId: Long,
    ): Boolean

    fun findByStatus(status: ReportStatus, pageable: Pageable): Page<Report>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Report>
    fun countByStatus(status: ReportStatus): Long
    fun countByTargetTypeAndTargetId(targetType: ReportTargetType, targetId: Long): Long
}
