package com.example.konkat.project

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface ProjectRepository : JpaRepository<Project, Long> {
    fun findByTitleContainingIgnoreCase(title: String): List<Project>
    fun findByOwnerId(ownerId: Long): List<Project>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Project>
    fun countByOwnerId(ownerId: Long): Long

    @Query(
        value = """
            SELECT * FROM projects
            WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
                  @@ to_tsquery('english', :query)
            ORDER BY ts_rank(
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')),
                to_tsquery('english', :query)
            ) DESC, created_at DESC
        """,
        nativeQuery = true,
    )
    fun fullTextSearch(@Param("query") query: String, pageable: Pageable): List<Project>
}
