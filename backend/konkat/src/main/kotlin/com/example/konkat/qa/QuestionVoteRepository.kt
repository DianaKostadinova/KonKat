package com.example.konkat.qa

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface QuestionVoteRepository : JpaRepository<QuestionVote, Long> {
    fun findByQuestionIdAndUserId(questionId: Long, userId: Long): QuestionVote?
    fun countByQuestionIdAndDirection(questionId: Long, direction: VoteDirection): Long
}
