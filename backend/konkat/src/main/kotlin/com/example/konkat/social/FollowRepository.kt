package com.example.konkat.social

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface FollowRepository : JpaRepository<UserFollow, Long> {

    /** Does followerId follow followingId? Used for follow-button state */
    fun existsByFollowerIdAndFollowingId(followerId: Long, followingId: Long): Boolean

    /** Find the specific row so we can delete it on unfollow */
    fun findByFollowerIdAndFollowingId(followerId: Long, followingId: Long): UserFollow?

    /** How many people follow this user (their follower count) */
    fun countByFollowingId(followingId: Long): Long

    /** How many people this user follows (their following count) */
    fun countByFollowerId(followerId: Long): Long
}
