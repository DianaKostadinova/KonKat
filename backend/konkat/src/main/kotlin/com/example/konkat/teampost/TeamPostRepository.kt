package com.example.konkat.teampost

import org.springframework.data.jpa.repository.JpaRepository

interface TeamPostRepository : JpaRepository<TeamPost, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<TeamPost>
    fun findByHackathonIdOrderByCreatedAtDesc(hackathonId: Long): List<TeamPost>
}

interface TeamRequestRepository : JpaRepository<TeamRequest, Long> {
    fun findByTeamPostIdAndRequesterId(teamPostId: Long, requesterId: Long): TeamRequest?
    fun findByTeamPostId(teamPostId: Long): List<TeamRequest>
    fun findByTeamPostIdAndStatus(teamPostId: Long, status: RequestStatus): List<TeamRequest>
    fun countByTeamPostIdAndStatus(teamPostId: Long, status: RequestStatus): Long
}
