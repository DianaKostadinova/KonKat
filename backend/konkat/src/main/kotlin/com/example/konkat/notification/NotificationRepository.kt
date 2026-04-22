package com.example.konkat.notification

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface NotificationRepository : JpaRepository<Notification, Long> {
    fun findByRecipientIdOrderByCreatedAtDesc(recipientId: Long): List<Notification>
    fun countByRecipientIdAndReadFalse(recipientId: Long): Long
}
