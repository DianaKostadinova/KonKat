package com.example.konkat.hackathon

import com.example.konkat.event.EventType
import com.example.konkat.event.SavedEvent
import com.example.konkat.event.SavedEventRepository
import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.transaction.Transactional
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
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

// ── Controller ────────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/hackathons")
@Transactional
class HackathonController(
    private val hackathonRepository: HackathonRepository,
    private val savedEventRepository: SavedEventRepository,
    private val userRepository: UserRepository,
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
            h.toDto(saved)
        })
    }

    /** POST /api/hackathons — create a hackathon (auth required) */
    @PostMapping
    fun createHackathon(
        @RequestBody body: CreateHackathonRequest,
        request: HttpServletRequest,
    ): ResponseEntity<HackathonDto> {
        val userId   = request.getAttribute("userId") as Long
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
            .body(hackathonRepository.save(hackathon).toDto(false))
    }

    /** POST /api/hackathons/{id}/save — toggle save for current user (auth required) */
    @PostMapping("/{id}/save")
    fun toggleSave(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, Boolean>> {
        val userId   = request.getAttribute("userId") as Long
        val existing = savedEventRepository.findByUserIdAndEventTypeAndEventId(userId, EventType.HACKATHON, id)

        return if (existing != null) {
            savedEventRepository.delete(existing)
            ResponseEntity.ok(mapOf("saved" to false))
        } else {
            hackathonRepository.findById(id).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Hackathon not found")
            }
            val user = userRepository.findById(userId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
            }
            savedEventRepository.save(SavedEvent(user = user, eventType = EventType.HACKATHON, eventId = id))
            ResponseEntity.ok(mapOf("saved" to true))
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun Hackathon.toDto(saved: Boolean) = HackathonDto(
        id             = id,
        title          = title,
        description    = description,
        location       = location,
        startDate      = startDate?.format(ISO),
        endDate        = endDate?.format(ISO),
        prize          = prize,
        maxTeamSize    = maxTeamSize,
        status         = status.name,
        tags           = tags.toList(),
        organizerName  = organizer.displayName,
        organizerAvatar = organizer.avatarUrl,
        saved          = saved,
    )
}
