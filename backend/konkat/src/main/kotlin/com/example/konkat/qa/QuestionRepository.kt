package com.example.konkat.qa

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface QuestionRepository : JpaRepository<Question, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<Question>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Question>
    fun findBySolvedOrderByCreatedAtDesc(solved: Boolean): List<Question>
    fun findBySolvedOrderByCreatedAtDesc(solved: Boolean, pageable: Pageable): Page<Question>
}
