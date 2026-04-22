package com.example.konkat.webinar

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
interface WebinarRepository : JpaRepository<Webinar, Long> {
    fun findByStartDateAfterAndStatusIn(date: LocalDateTime, statuses: List<WebinarStatus>): List<Webinar>
    fun findByOrganizerId(organizerId: Long): List<Webinar>
}
