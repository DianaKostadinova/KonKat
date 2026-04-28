package com.example.konkat.qa

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface QuestionRepository : JpaRepository<Question, Long> {
    fun findAllByOrderByCreatedAtDesc(): List<Question>
    fun findBySolvedOrderByCreatedAtDesc(solved: Boolean): List<Question>
}
