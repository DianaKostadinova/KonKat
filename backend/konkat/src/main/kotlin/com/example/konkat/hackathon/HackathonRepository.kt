package com.example.konkat.hackathon

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface HackathonRepository : JpaRepository<Hackathon, Long> {
    fun findByTitleContainingIgnoreCase(title: String): List<Hackathon>
    fun findByOrganizerId(organizerId: Long): List<Hackathon>
    fun findByStatusIn(statuses: List<HackathonStatus>): List<Hackathon>

    @Query(
        value = """
            SELECT * FROM hackathons
            WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
                  @@ to_tsquery('english', :query)
            ORDER BY ts_rank(
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')),
                to_tsquery('english', :query)
            ) DESC
        """,
        nativeQuery = true,
    )
    fun fullTextSearch(@Param("query") query: String, pageable: Pageable): List<Hackathon>
}
