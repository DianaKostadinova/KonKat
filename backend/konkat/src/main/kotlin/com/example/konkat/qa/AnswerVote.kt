package com.example.konkat.qa

import com.example.konkat.user.User
import jakarta.persistence.*

@Entity
@Table(
    name = "qa_answer_votes",
    uniqueConstraints = [UniqueConstraint(columnNames = ["answer_id", "user_id"])],
)
data class AnswerVote(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "answer_id", nullable = false)
    val answer: Answer,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    var direction: VoteDirection,
)
