package com.example.konkat.teampost

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import java.util.Optional

interface TeamPostRepository : JpaRepository<TeamPost, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<TeamPost>
    fun findByHackathonIdOrderByCreatedAtDesc(hackathonId: Long): List<TeamPost>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM TeamPost t WHERE t.id = :id")
    fun findByIdForUpdate(id: Long): Optional<TeamPost>
}

interface TeamRequestRepository : JpaRepository<TeamRequest, Long> {
    fun findByTeamPostIdAndRequesterId(teamPostId: Long, requesterId: Long): TeamRequest?
    fun findByTeamPostId(teamPostId: Long): List<TeamRequest>
    fun findByTeamPostIdAndStatus(teamPostId: Long, status: RequestStatus): List<TeamRequest>
    fun countByTeamPostIdAndStatus(teamPostId: Long, status: RequestStatus): Long
}
