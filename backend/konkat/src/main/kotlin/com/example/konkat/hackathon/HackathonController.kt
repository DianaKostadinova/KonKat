package com.example.konkat.hackathon

import com.example.konkat.event.EventType
import com.example.konkat.event.SavedEvent
import com.example.konkat.event.SavedEventRepository
import com.example.konkat.notification.NotificationSender
import com.example.konkat.notification.NotificationType
import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class HackathonDto(
    val id: Long,
    val title: String,
    val description: String?,
    val location: String?,
    val startDate: String?,
    val endDate: String?,
    val prize: String?,
    val maxTeamSize: Int?,
    val status: String,
    val tags: List<String>,
    val organizerName: String,
    val organizerAvatar: String?,
    val saved: Boolean = false,
    val registered: Boolean = false,
    val participantCount: Long = 0,
)

data class CreateHackathonRequest(
    val title: String,
    val description: String?    = null,
    val location: String?       = null,
    val startDate: String?      = null,
    val endDate: String?        = null,
    val prize: String?          = null,
    val maxTeamSize: Int?       = null,
    val tags: List<String>      = emptyList(),
    val bannerUrl: String?      = null,
)

data class RegisterRequest(
    val teamName: String? = null,
    val role: String?     = null,
)

data class RegisterResponse(
    val registered: Boolean,
    val teamName: String?,
    val role: String?,
    val participantCount: Long,
)

data class ParticipantDto(
    val userId: Long,
    val name: String,
    val avatarUrl: String?,
    val role: String?,
    val teamName: String?,
    val joinedAt: String,
)

// ── Controller ────────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/hackathons")
@Transactional                          // Spring @Transactional (not jakarta)
class HackathonController(
    private val hackathonRepository:    HackathonRepository,
    private val participantRepository:  HackathonParticipantRepository,
    private val savedEventRepository:   SavedEventRepository,
    private val notificationSender:     NotificationSender,  // isolated REQUIRES_NEW transactions
    private val userRepository:         UserRepository,
) {

    /** GET /api/hackathons — list upcoming + open hackathons (public) */
    @GetMapping
    fun getUpcoming(request: HttpServletRequest): ResponseEntity<List<HackathonDto>> {
        val currentUserId = request.getAttribute("userId") as? Long
        val hackathons = hackathonRepository.findByStatusIn(
            listOf(HackathonStatus.UPCOMING, HackathonStatus.OPEN)
        )
        return ResponseEntity.ok(hackathons.map { h ->
            val saved = currentUserId?.let {
                savedEventRepository.existsByUserIdAndEventTypeAndEventId(it, EventType.HACKATHON, h.id)
            } ?: false
            val registered = currentUserId?.let {
                participantRepository.existsByUserIdAndHackathonId(it, h.id)
            } ?: false
            val count = participantRepository.countByHackathonId(h.id)
            h.toDto(saved, registered, count)
        })
    }

    /** POST /api/hackathons — create a hackathon (auth required) */
    @PostMapping
    fun createHackathon(
        @RequestBody body: CreateHackathonRequest,
        request: HttpServletRequest,
    ): ResponseEntity<HackathonDto> {
        val userId    = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val organizer = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        val hackathon = Hackathon(
            organizer   = organizer,
            title       = body.title.trim(),
            description = body.description,
            location    = body.location,
            startDate   = body.startDate?.let { LocalDateTime.parse(it, ISO) },
            endDate     = body.endDate?.let   { LocalDateTime.parse(it, ISO) },
            prize       = body.prize,
            maxTeamSize = body.maxTeamSize,
            bannerUrl   = body.bannerUrl,
            status      = HackathonStatus.UPCOMING,
        ).also { it.tags.addAll(body.tags) }

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(hackathonRepository.save(hackathon).toDto(false, false, 0))
    }

    /** POST /api/hackathons/{id}/register — register (or unregister) for a hackathon */
    @PostMapping("/{id}/register")
    fun register(
        @PathVariable id: Long,
        @RequestBody(required = false) body: RegisterRequest?,
        request: HttpServletRequest,
    ): ResponseEntity<RegisterResponse> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")

        val existing = participantRepository.findByUserIdAndHackathonId(userId, id)
        if (existing != null) {
            // Already registered → unregister (toggle)
            participantRepository.delete(existing)
            val count = participantRepository.countByHackathonId(id)
            return ResponseEntity.ok(RegisterResponse(false, null, null, count))
        }

        // Not registered yet → register
        val hackathon = hackathonRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
        }
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }

        val participant = HackathonParticipant(
            hackathon = hackathon,
            user      = user,
            teamName  = body?.teamName?.trim()?.ifBlank { null },
            role      = body?.role?.trim()?.ifBlank { null },
        )
        participantRepository.save(participant)
        val count = participantRepository.countByHackathonId(id)

        // Notify the organizer — runs in its own REQUIRES_NEW transaction so a
        // failure here can never roll back the registration above.
        if (hackathon.organizer.id != userId) {
            notificationSender.send(
                recipient   = hackathon.organizer,
                actor       = user,
                type        = NotificationType.HACKATHON_REGISTER,
                hackathonId = hackathon.id,
            )
        }

        return ResponseEntity.ok(RegisterResponse(true, participant.teamName, participant.role, count))
    }

    /** GET /api/hackathons/{id}/participants — list who's going */
    @GetMapping("/{id}/participants")
    fun getParticipants(@PathVariable id: Long): ResponseEntity<List<ParticipantDto>> {
        val participants = participantRepository.findByHackathonId(id)
        return ResponseEntity.ok(participants.map { p ->
            ParticipantDto(
                userId    = p.user.id,
                name      = p.user.displayName,
                avatarUrl = p.user.avatarUrl,
                role      = p.role,
                teamName  = p.teamName,
                joinedAt  = p.joinedAt?.format(ISO) ?: "",
            )
        })
    }

    /** POST /api/hackathons/{id}/save — toggle save for current user (auth required) */
    @PostMapping("/{id}/save")
    fun toggleSave(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, Boolean>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")

        val existing = savedEventRepository.findByUserIdAndEventTypeAndEventId(userId, EventType.HACKATHON, id)
        if (existing != null) {
            savedEventRepository.delete(existing)
            return ResponseEntity.ok(mapOf("saved" to false))
        }

        val hackathon = hackathonRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
        }
        val user = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        savedEventRepository.save(SavedEvent(user = user, eventType = EventType.HACKATHON, eventId = id))

        // Notify organizer — isolated transaction, failure is safe to ignore
        if (hackathon.organizer.id != userId) {
            notificationSender.send(
                recipient   = hackathon.organizer,
                actor       = user,
                type        = NotificationType.HACKATHON_SAVED,
                hackathonId = hackathon.id,
            )
        }

        return ResponseEntity.ok(mapOf("saved" to true))
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun Hackathon.toDto(saved: Boolean, registered: Boolean, count: Long) = HackathonDto(
        id               = id,
        title            = title,
        description      = description,
        location         = location,
        startDate        = startDate?.format(ISO),
        endDate          = endDate?.format(ISO),
        prize            = prize,
        maxTeamSize      = maxTeamSize,
        status           = status.name,
        tags             = tags.toList(),
        organizerName    = organizer.displayName,
        organizerAvatar  = organizer.avatarUrl,
        saved            = saved,
        registered       = registered,
        participantCount = count,
    )
}
