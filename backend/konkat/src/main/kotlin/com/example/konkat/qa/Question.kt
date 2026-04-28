package com.example.konkat.qa

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "qa_questions")
data class Question(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User,

    @Column(nullable = false)
    var title: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    var content: String,

    var codeLanguage: String? = null,

    @Column(columnDefinition = "TEXT")
    var codeSnippet: String? = null,

    @ElementCollection
    @CollectionTable(name = "qa_question_tags", joinColumns = [JoinColumn(name = "question_id")])
    @Column(name = "tag")
    var tags: MutableList<String> = mutableListOf(),

    var views: Long = 0,

    var solved: Boolean = false,

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
