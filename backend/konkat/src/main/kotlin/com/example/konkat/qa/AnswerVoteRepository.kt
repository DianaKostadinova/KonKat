package com.example.konkat.qa

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AnswerVoteRepository : JpaRepository<AnswerVote, Long> {
    fun findByAnswerIdAndUserId(answerId: Long, userId: Long): AnswerVote?
    fun countByAnswerIdAndDirection(answerId: Long, direction: VoteDirection): Long
}
