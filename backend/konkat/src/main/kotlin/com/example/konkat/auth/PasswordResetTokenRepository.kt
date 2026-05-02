package com.example.konkat.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface PasswordResetTokenRepository : JpaRepository<PasswordResetToken, Long> {
    fun findByToken(token: String): PasswordResetToken?

    /** Delete any still-valid unused tokens for this user before issuing a new one */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.user.id = :userId AND t.used = false AND t.expiresAt > :now")
    fun deleteActiveTokensForUser(@Param("userId") userId: Long, @Param("now") now: LocalDateTime)
}
