package com.example.konkat.notification

import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service

@Service
class NotificationPushService(
    private val messagingTemplate: SimpMessagingTemplate,
) {

    private val log = LoggerFactory.getLogger(NotificationPushService::class.java)

    fun push(recipientId: Long, dto: NotificationDto) {
        try {
            messagingTemplate.convertAndSendToUser(
                recipientId.toString(),
                "/queue/notifications",
                dto,
            )
        } catch (ex: Exception) {
            log.warn("WebSocket push failed for user {}: {}", recipientId, ex.message)
        }
    }
}
