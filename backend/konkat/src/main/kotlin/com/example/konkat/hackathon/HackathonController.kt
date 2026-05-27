package com.example.konkat.hackathon

import com.example.konkat.event.EventType
import com.example.konkat.event.SavedEvent
import com.example.konkat.event.SavedEventRepository
import com.example.konkat.notification.NotificationSender
import com.example.konkat.notification.NotificationType
import com.example.konkat.user.UserRepository
import com.example.konkat.workspace.WorkspaceService
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
    @field:jakarta.validation.constraints.NotBlank(message = "Title must not be blank")
    @field:jakarta.validation.constraints.Size(max = 200, message = "Title must be at most 200 characters")
    val title: String,
    @field:jakarta.validation.constraints.Size(max = 5000)
    val description: String?    = null,
    @field:jakarta.validation.constraints.Size(max = 200)
    val location: String?       = null,
    val startDate: String?      = null,
    val endDate: String?        = null,
    @field:jakarta.validation.constraints.Size(max = 200)
    val prize: String?          = null,
    @field:jakarta.validation.constraints.Min(2)
    @field:jakarta.validation.constraints.Max(20)
    val maxTeamSize: Int?       = null,
    @field:jakarta.validation.constraints.Size(max = 10, message = "At most 10 tags allowed")
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
    private val workspaceService:       WorkspaceService,
) {

    /** GET /api/hackathons/all — list all hackathons regardless of status (for team post creation) */
    @GetMapping("/all")
    fun getAll(request: HttpServletRequest): ResponseEntity<List<HackathonDto>> {
        val currentUserId = request.getAttribute("userId") as? Long
        val hackathons = hackathonRepository.findAll()
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

    /** GET /api/hackathons/{id} — single hackathon by id */
    @GetMapping("/{id}")
    fun getOne(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<HackathonDto> {
        val currentUserId = request.getAttribute("userId") as? Long
        val h = hackathonRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
        }
        val saved = currentUserId?.let {
            savedEventRepository.existsByUserIdAndEventTypeAndEventId(it, EventType.HACKATHON, h.id)
        } ?: false
        val registered = currentUserId?.let {
            participantRepository.existsByUserIdAndHackathonId(it, h.id)
        } ?: false
        val count = participantRepository.countByHackathonId(h.id)
        return ResponseEntity.ok(h.toDto(saved, registered, count))
    }

    /** GET /api/hackathons/registered — upcoming hackathons the current user is registered for */
    @GetMapping("/registered")
    fun getRegistered(request: HttpServletRequest): ResponseEntity<List<HackathonDto>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")

        val hackathons = participantRepository.findByUserId(userId)
            .map { it.hackathon }
            .filter { it.status == HackathonStatus.UPCOMING || it.status == HackathonStatus.OPEN }

        return ResponseEntity.ok(hackathons.map { h ->
            val saved = savedEventRepository.existsByUserIdAndEventTypeAndEventId(userId, EventType.HACKATHON, h.id)
            val count = participantRepository.countByHackathonId(h.id)
            h.toDto(saved, registered = true, count)
        })
    }

    /** POST /api/hackathons — create a hackathon (auth required) */
    @PostMapping
    fun createHackathon(
        @jakarta.validation.Valid @RequestBody body: CreateHackathonRequest,
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

    /** PUT /api/hackathons/{id} — update a hackathon (organizer only) */
    @PutMapping("/{id}")
    fun updateHackathon(
        @PathVariable id: Long,
        @jakarta.validation.Valid @RequestBody body: CreateHackathonRequest,
        request: HttpServletRequest,
    ): ResponseEntity<HackathonDto> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val hackathon = hackathonRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
        }
        if (hackathon.organizer.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the organizer can edit this hackathon")

        hackathon.title       = body.title.trim()
        hackathon.description = body.description
        hackathon.location    = body.location
        hackathon.startDate   = body.startDate?.let { LocalDateTime.parse(it, ISO) }
        hackathon.endDate     = body.endDate?.let   { LocalDateTime.parse(it, ISO) }
        hackathon.prize       = body.prize
        hackathon.maxTeamSize = body.maxTeamSize
        body.bannerUrl?.let { hackathon.bannerUrl = it }
        hackathon.tags.clear()
        hackathon.tags.addAll(body.tags)

        val saved = hackathonRepository.save(hackathon)
        val savedFlag    = savedEventRepository.existsByUserIdAndEventTypeAndEventId(userId, EventType.HACKATHON, id)
        val registered   = participantRepository.existsByUserIdAndHackathonId(userId, id)
        val participants = participantRepository.countByHackathonId(id)
        return ResponseEntity.ok(saved.toDto(savedFlag, registered, participants))
    }

    /** DELETE /api/hackathons/{id} — delete a hackathon (organizer only) */
    @DeleteMapping("/{id}")
    fun deleteHackathon(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val hackathon = hackathonRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
        }
        if (hackathon.organizer.id != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the organizer can delete this hackathon")

        // Clean up dependent rows the schema doesn't cascade automatically.
        participantRepository.findByHackathonId(id).forEach { participantRepository.delete(it) }
        savedEventRepository.findAllByEventTypeAndEventId(EventType.HACKATHON, id)
            .forEach { savedEventRepository.delete(it) }
        hackathonRepository.delete(hackathon)
        return ResponseEntity.noContent().build()
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

        if (!participant.teamName.isNullOrBlank()) {
            workspaceService.getOrCreateHackathonWorkspace(hackathon, user, participant.teamName!!, participant.role)
        }

        if (hackathon.organizer.id != userId) {
            runCatching {
                notificationSender.send(
                    recipient   = hackathon.organizer,
                    actor       = user,
                    type        = NotificationType.HACKATHON_REGISTER,
                    hackathonId = hackathon.id,
                )
            }
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

        if (hackathon.organizer.id != userId) {
            runCatching {
                notificationSender.send(
                    recipient   = hackathon.organizer,
                    actor       = user,
                    type        = NotificationType.HACKATHON_SAVED,
                    hackathonId = hackathon.id,
                )
            }
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
