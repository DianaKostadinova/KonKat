package com.example.konkat.auth

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "password_reset_tokens")
class PasswordResetToken(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    /** Unique random token sent to the user */
    @Column(nullable = false, unique = true)
    val token: String = UUID.randomUUID().toString(),

    /** 1-hour window */
    @Column(nullable = false)
    val expiresAt: LocalDateTime,

    /** Prevent reuse after the password has been changed */
    var used: Boolean = false,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
