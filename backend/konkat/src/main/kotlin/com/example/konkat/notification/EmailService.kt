package com.example.konkat.notification

import com.example.konkat.user.User
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service

@Service
class EmailService(
    private val mailSender: JavaMailSender,
    @Value("\${app.mail.from:noreply@konkat.dev}") private val from: String,
    @Value("\${app.mail.base-url:http://localhost:4200}") private val baseUrl: String,
    @Value("\${app.mail.enabled:false}") private val enabled: Boolean,
) {
    private val log = LoggerFactory.getLogger(EmailService::class.java)

    @Async
    fun sendNotificationEmail(recipient: User, actor: User?, type: NotificationType) {
        if (!enabled) return
        val email = recipient.email ?: return

        val (subject, body) = buildEmail(recipient, actor, type) ?: return

        runCatching {
            val msg = mailSender.createMimeMessage()
            MimeMessageHelper(msg, false, "UTF-8").apply {
                setFrom(from)
                setTo(email)
                setSubject(subject)
                setText(buildHtml(recipient.displayName, body), true)
            }
            mailSender.send(msg)
        }.onFailure { ex ->
            log.warn("Failed to send email type={} to {}: {}", type, email, ex.message)
        }
    }

    private fun buildEmail(recipient: User, actor: User?, type: NotificationType): Pair<String, String>? {
        val actorName = actor?.displayName ?: "Someone"
        return when (type) {
            NotificationType.FOLLOW ->
                "New follower on KonKat" to
                    "$actorName started following you. <a href=\"$baseUrl/profile/${actor?.id}\">View their profile</a>"

            NotificationType.POST_COMMENT ->
                "$actorName commented on your post" to
                    "$actorName left a comment on one of your posts. <a href=\"$baseUrl/feed\">See it on KonKat</a>"

            NotificationType.POST_LIKE ->
                "$actorName liked your post" to
                    "$actorName liked your post. <a href=\"$baseUrl/feed\">Go to your feed</a>"

            NotificationType.TEAM_REQUEST ->
                "New team join request" to
                    "$actorName wants to join your team. <a href=\"$baseUrl/find-team\">Review the request</a>"

            NotificationType.HACKATHON_STARTED ->
                "Your hackathon is starting!" to
                    "A hackathon you registered for has started. <a href=\"$baseUrl/hackathons\">Go to hackathons</a>"

            NotificationType.QA_ANSWER ->
                "$actorName answered your question" to
                    "$actorName answered your question on KonKat. <a href=\"$baseUrl/qa\">See the answer</a>"

            NotificationType.QA_ANSWER_ACCEPTED ->
                "Your answer was accepted!" to
                    "$actorName accepted your answer. <a href=\"$baseUrl/qa\">View on KonKat</a>"

            else -> null
        }
    }

    private fun buildHtml(recipientName: String, body: String): String = """
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;background:#111;color:#f0f0f0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:12px;padding:32px;border:1px solid #2a2a2a;">
            <h2 style="color:#E8593C;margin-top:0;">KonKat</h2>
            <p>Hi $recipientName,</p>
            <p>$body</p>
            <hr style="border-color:#2a2a2a;margin:24px 0;">
            <p style="font-size:12px;color:#888;">
              You received this because you have an account on KonKat.<br>
              <a href="$baseUrl/profile/edit" style="color:#E8593C;">Manage notification settings</a>
            </p>
          </div>
        </body>
        </html>
    """.trimIndent()
}
