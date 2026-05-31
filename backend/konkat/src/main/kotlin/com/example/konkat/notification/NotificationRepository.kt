package com.example.konkat.notification

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface NotificationRepository : JpaRepository<Notification, Long> {
    fun findByRecipientIdOrderByCreatedAtDesc(recipientId: Long): List<Notification>
    fun findByRecipientId(recipientId: Long, pageable: Pageable): List<Notification>
    fun countByRecipientIdAndReadFalse(recipientId: Long): Long

    /** Bulk update: mark all unread notifications as read for a user */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.id = :recipientId AND n.read = false")
    fun markAllReadByRecipientId(@Param("recipientId") recipientId: Long)
}
