package com.example.konkat.qa

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface QuestionRepository : JpaRepository<Question, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<Question>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Question>
    fun findBySolvedOrderByCreatedAtDesc(solved: Boolean): List<Question>
    fun findBySolvedOrderByCreatedAtDesc(solved: Boolean, pageable: Pageable): Page<Question>
    fun findByTitleContainingIgnoreCaseOrderByCreatedAtDesc(title: String): List<Question>
    fun findByContentContainingIgnoreCaseOrderByCreatedAtDesc(content: String): List<Question>

    @Query(
        value = """
            SELECT * FROM qa_questions
            WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
                  @@ to_tsquery('english', :query)
            ORDER BY ts_rank(
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')),
                to_tsquery('english', :query)
            ) DESC, created_at DESC
        """,
        nativeQuery = true,
    )
    fun fullTextSearch(@Param("query") query: String, pageable: Pageable): List<Question>
}
