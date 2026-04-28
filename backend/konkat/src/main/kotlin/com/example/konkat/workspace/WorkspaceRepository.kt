package com.example.konkat.workspace

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface WorkspaceRepository : JpaRepository<Workspace, Long> {
    fun findByHackathonIdAndTeamName(hackathonId: Long, teamName: String): Workspace?
}

@Repository
interface WorkspaceMemberRepository : JpaRepository<WorkspaceMember, Long> {
    fun findByUserId(userId: Long): List<WorkspaceMember>
    fun findByWorkspaceId(workspaceId: Long): List<WorkspaceMember>
    fun existsByWorkspaceIdAndUserId(workspaceId: Long, userId: Long): Boolean
}

@Repository
interface WorkspaceTaskRepository : JpaRepository<WorkspaceTask, Long> {
    fun findByWorkspaceIdOrderByCreatedAtAsc(workspaceId: Long): List<WorkspaceTask>
    fun countByWorkspaceIdAndStatus(workspaceId: Long, status: TaskStatus): Long
    fun countByWorkspaceId(workspaceId: Long): Long
}

@Repository
interface WorkspaceMessageRepository : JpaRepository<WorkspaceMessage, Long> {
    fun findTop50ByWorkspaceIdOrderByCreatedAtAsc(workspaceId: Long): List<WorkspaceMessage>
}
