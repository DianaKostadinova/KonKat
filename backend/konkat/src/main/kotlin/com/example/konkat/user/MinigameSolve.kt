package com.example.konkat.user

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(
    name = "minigame_solves",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "game", "solve_date"])],
)
data class MinigameSolve(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false, length = 32)
    val game: String,

    @Column(name = "solve_date", nullable = false)
    val solveDate: LocalDate,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

interface MinigameSolveRepository : JpaRepository<MinigameSolve, Long> {
    fun existsByUserIdAndGameAndSolveDate(userId: Long, game: String, solveDate: LocalDate): Boolean
}
