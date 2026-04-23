package com.example.konkat.notification

import com.example.konkat.user.User
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * Thin helper that persists a single notification in its **own** transaction
 * (REQUIRES_NEW).
 *
 * Why a separate bean?  Spring's @Transactional proxy is only applied when a
 * method is called through the Spring proxy — i.e. from *outside* the bean.
 * Calling a @Transactional method on the same class bypasses the proxy, so
 * the propagation contract is ignored.  Putting the save here guarantees the
 * notification runs in an isolated transaction.
 *
 * Why REQUIRES_NEW?  If the notification INSERT fails (e.g. the table hasn't
 * been created yet, or a constraint fires) we want only *this* transaction to
 * roll back, leaving the caller's registration/save-toggle transaction
 * completely unaffected — no "rollback-only" marker, no session corruption.
 */
@Service
class NotificationSender(
    private val notificationRepository: NotificationRepository,
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
    ) {
        try {
            notificationRepository.save(
                Notification(
                    recipient   = recipient,
                    actor       = actor,
                    type        = type,
                    postId      = postId,
                    projectId   = projectId,
                    hackathonId = hackathonId,
                )
            )
        } catch (ex: Exception) {
            // Log but swallow — a failed notification must never break the
            // calling operation (registration, save-toggle, etc.)
            log.warn("Failed to persist notification type={} for recipient={}: {}",
                type, recipient.id, ex.message)
        }
    }
}
