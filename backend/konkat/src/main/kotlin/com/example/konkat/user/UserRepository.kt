package com.example.konkat.user

import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): Optional<User>
    fun existsByEmail(email: String): Boolean
    fun existsByUsername(username: String): Boolean

    // Search by display name OR username, case-insensitive
    fun findByDisplayNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(
        displayName: String,
        username: String,
    ): List<User>
}
