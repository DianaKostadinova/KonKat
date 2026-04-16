package com.example.konkat.user

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false)
    val email: String,

    @Column(nullable = false)
    var password: String,

    @Column(nullable = false)
    var displayName: String,

    @Column(unique = true)
    var username: String? = null,

    var avatarUrl: String? = null,
    var bio: String? = null,
    var location: String? = null,

    @ElementCollection
    @CollectionTable(name = "user_tech_stack", joinColumns = [JoinColumn(name = "user_id")])
    @Column(name = "tech")
    var techStack: MutableList<String> = mutableListOf(),

    @Enumerated(EnumType.STRING)
    var role: Role = Role.USER,

    val createdAt: LocalDateTime = LocalDateTime.now(),
)

enum class Role { USER, ADMIN }
