package com.example.konkat.user

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserRepository : JpaRepository<User, Long> {
    fun findByFirebaseUid(firebaseUid: String): Optional<User>
    fun findByEmail(email: String): Optional<User>
    fun existsByEmail(email: String): Boolean
    fun existsByUsername(username: String): Boolean

    fun findByDisplayNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(
        displayName: String,
        username: String,
    ): List<User>

    fun findAllByOrderByReputationDesc(pageable: Pageable): List<User>
}
