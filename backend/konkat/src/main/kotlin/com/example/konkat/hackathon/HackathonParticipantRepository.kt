package com.example.konkat.hackathon

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface HackathonParticipantRepository : JpaRepository<HackathonParticipant, Long> {
    fun findByHackathonId(hackathonId: Long): List<HackathonParticipant>
    fun findByUserIdAndHackathonId(userId: Long, hackathonId: Long): HackathonParticipant?
    fun existsByUserIdAndHackathonId(userId: Long, hackathonId: Long): Boolean
    fun countByHackathonId(hackathonId: Long): Long
}
