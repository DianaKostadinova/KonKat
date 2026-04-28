package com.example.konkat.qa

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "qa_answers")
data class Answer(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    val question: Question,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User,

    @Column(nullable = false, columnDefinition = "TEXT")
    var content: String,

    var codeLanguage: String? = null,

    @Column(columnDefinition = "TEXT")
    var codeSnippet: String? = null,

    var isAccepted: Boolean = false,

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
