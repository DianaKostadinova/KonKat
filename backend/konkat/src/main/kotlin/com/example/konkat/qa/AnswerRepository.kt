package com.example.konkat.qa

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AnswerRepository : JpaRepository<Answer, Long> {
    fun findByQuestionIdOrderByIsAcceptedDescCreatedAtAsc(questionId: Long): List<Answer>
    fun countByQuestionId(questionId: Long): Long
}
