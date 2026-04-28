package com.example.konkat.qa

import com.example.konkat.user.User
import jakarta.persistence.*

enum class VoteDirection { UP, DOWN }

@Entity
@Table(
    name = "qa_question_votes",
    uniqueConstraints = [UniqueConstraint(columnNames = ["question_id", "user_id"])],
)
data class QuestionVote(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    val question: Question,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    var direction: VoteDirection,
)
