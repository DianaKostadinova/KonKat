package com.example.konkat.notification

import com.example.konkat.user.User
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager

/**
 * Thin helper that persists a single notification in its own transaction
 * (REQUIRES_NEW) and then pushes it over WebSocket after the commit.
 *
 * The push is registered as an afterCommit hook so the DB row is guaranteed
 * to exist by the time the client receives the event and re-fetches.
 */
@Service
class NotificationSender(
    private val notificationRepository: NotificationRepository,
    private val pushService: NotificationPushService,
    private val emailService: EmailService,
) {

    private val log = LoggerFactory.getLogger(NotificationSender::class.java)

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun send(
        recipient:   User,
        actor:       User?,
        type:        NotificationType,
        postId:      Long? = null,
        projectId:   Long? = null,
        hackathonId: Long? = null,
        webinarId:   Long? = null,
    ) {
        val saved = try {
            notificationRepository.save(
                Notification(
                    recipient   = recipient,
                    actor       = actor,
                    type        = type,
                    postId      = postId,
                    projectId   = projectId,
                    hackathonId = hackathonId,
                    webinarId   = webinarId,
                )
            )
        } catch (ex: Exception) {
            log.warn("Failed to persist notification type={} for recipient={}: {}",
                type, recipient.id, ex.message)
            return
        }

        // Check recipient's email preferences before sending
        val shouldEmail = when (type) {
            NotificationType.FOLLOW             -> recipient.emailOnFollow
            NotificationType.POST_LIKE,
            NotificationType.POST_SHARE         -> recipient.emailOnPostLike
            NotificationType.POST_COMMENT       -> recipient.emailOnPostComment
            NotificationType.MESSAGE            -> recipient.emailOnMessage
            NotificationType.HACKATHON_REGISTER,
            NotificationType.HACKATHON_SAVED,
            NotificationType.HACKATHON_INVITE,
            NotificationType.HACKATHON_STARTED  -> recipient.emailOnHackathon
            NotificationType.WEBINAR_ATTEND     -> recipient.emailOnWebinar
            NotificationType.QA_ANSWER,
            NotificationType.QA_ANSWER_ACCEPTED,
            NotificationType.QA_VOTE            -> recipient.emailOnQa
            else                                -> true
        }
        // Send email asynchronously (fire-and-forget, never blocks the request)
        if (shouldEmail) emailService.sendNotificationEmail(recipient, actor, type)

        // Push via WebSocket only after the REQUIRES_NEW transaction commits,
        // so the client's follow-up GET will always find the row.
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                val dto = NotificationDto(
                    id          = saved.id,
                    type        = saved.type.name,
                    actorId     = saved.actor?.id,
                    actorName   = saved.actor?.displayName,
                    actorAvatar = saved.actor?.avatarUrl,
                    hackathonId = saved.hackathonId,
                    postId      = saved.postId,
                    projectId   = saved.projectId,
                    webinarId   = saved.webinarId,
                    read        = false,
                    createdAt   = saved.createdAt?.toString() ?: "",
                    timeAgo     = "just now",
                )
                pushService.push(saved.recipient.id, dto)
            }
        })
    }
}
