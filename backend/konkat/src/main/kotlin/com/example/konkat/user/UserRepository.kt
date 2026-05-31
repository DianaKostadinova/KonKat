package com.example.konkat.user

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
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

    /**
     * Full-text search on display_name + username + bio using Postgres tsvector.
     * Ranked by ts_rank so the best matches come first.
     */
    @Query(
        value = """
            SELECT * FROM users
            WHERE to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(username,'') || ' ' || coalesce(bio,''))
                  @@ to_tsquery('english', :query)
            ORDER BY ts_rank(
                to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(username,'') || ' ' || coalesce(bio,'')),
                to_tsquery('english', :query)
            ) DESC
        """,
        nativeQuery = true,
    )
    fun fullTextSearch(@Param("query") query: String, pageable: Pageable): List<User>
}
