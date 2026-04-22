package com.example.konkat.hackathon

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface HackathonRepository : JpaRepository<Hackathon, Long> {
    fun findByTitleContainingIgnoreCase(title: String): List<Hackathon>
    fun findByOrganizerId(organizerId: Long): List<Hackathon>
    fun findByStatusIn(statuses: List<HackathonStatus>): List<Hackathon>
}
