package com.example.konkat.project

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ProjectReactionRepository : JpaRepository<ProjectReaction, Long> {

    fun findByProjectIdAndUserIdAndType(
        projectId: Long, userId: Long, type: ProjectReactionType,
    ): ProjectReaction?

    fun countByProjectIdAndType(projectId: Long, type: ProjectReactionType): Long

    fun existsByProjectIdAndUserIdAndType(
        projectId: Long, userId: Long, type: ProjectReactionType,
    ): Boolean

    /** Returns the set of project IDs the user has reacted to with the given type. */
    fun findByUserIdAndTypeAndProjectIdIn(
        userId: Long, type: ProjectReactionType, projectIds: List<Long>,
    ): List<ProjectReaction>
}
