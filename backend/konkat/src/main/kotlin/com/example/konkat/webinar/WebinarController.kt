package com.example.konkat.webinar

import com.example.konkat.event.EventType
import com.example.konkat.event.SavedEvent
import com.example.konkat.event.SavedEventRepository
import com.example.konkat.user.UserRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

// ── DTOs ──────────────────────────────────────────────────────────────────────

data class WebinarDto(
    val id: Long,
    val title: String,
    val description: String?,
    val speakerName: String?,
    val speakerTitle: String?,
    val startDate: String?,
    val endDate: String?,
    val location: String?,
    val joinUrl: String?,
    val thumbnailUrl: String?,
    val status: String,
    val tags: List<String>,
    val organizerName: String,
    val saved: Boolean = false,
)

data class CreateWebinarRequest(
    val title: String,
    val description: String?  = null,
    val speakerName: String?  = null,
    val speakerTitle: String? = null,
    val startDate: String?    = null,
    val endDate: String?      = null,
    val location: String?     = "Online",
    val joinUrl: String?      = null,
    val thumbnailUrl: String? = null,
    val tags: List<String>    = emptyList(),
)

// ── Controller ────────────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/webinars")
@Transactional
class WebinarController(
    private val webinarRepository: WebinarRepository,
    private val savedEventRepository: SavedEventRepository,
    private val userRepository: UserRepository,
) {

    /** GET /api/webinars — list upcoming/live webinars (public) */
    @GetMapping
    fun getUpcoming(request: HttpServletRequest): ResponseEntity<List<WebinarDto>> {
        val currentUserId = request.getAttribute("userId") as? Long
        val webinars = webinarRepository.findByStartDateAfterAndStatusIn(
            LocalDateTime.now(),
            listOf(WebinarStatus.UPCOMING, WebinarStatus.LIVE)
        )
        return ResponseEntity.ok(webinars.map { w ->
            val saved = currentUserId?.let {
                savedEventRepository.existsByUserIdAndEventTypeAndEventId(it, EventType.WEBINAR, w.id)
            } ?: false
            w.toDto(saved)
        })
    }

    /** POST /api/webinars — create a webinar (auth required) */
    @PostMapping
    fun createWebinar(
        @RequestBody body: CreateWebinarRequest,
        request: HttpServletRequest,
    ): ResponseEntity<WebinarDto> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val organizer = userRepository.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        }
        val webinar = Webinar(
            organizer    = organizer,
            title        = body.title.trim(),
            description  = body.description,
            speakerName  = body.speakerName,
            speakerTitle = body.speakerTitle,
            startDate    = body.startDate?.let { LocalDateTime.parse(it, ISO) },
            endDate      = body.endDate?.let   { LocalDateTime.parse(it, ISO) },
            location     = body.location ?: "Online",
            joinUrl      = body.joinUrl,
            thumbnailUrl = body.thumbnailUrl,
            status       = WebinarStatus.UPCOMING,
        ).also { it.tags.addAll(body.tags) }

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(webinarRepository.save(webinar).toDto(false))
    }

    /** POST /api/webinars/{id}/save — toggle save for current user (auth required) */
    @PostMapping("/{id}/save")
    fun toggleSave(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, Boolean>> {
        val userId = (request.getAttribute("userId") as? Long)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val existing = savedEventRepository.findByUserIdAndEventTypeAndEventId(userId, EventType.WEBINAR, id)

        return if (existing != null) {
            savedEventRepository.delete(existing)
            ResponseEntity.ok(mapOf("saved" to false))
        } else {
            webinarRepository.findById(id).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "Webinar not found")
            }
            val user = userRepository.findById(userId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
            }
            savedEventRepository.save(SavedEvent(user = user, eventType = EventType.WEBINAR, eventId = id))
            ResponseEntity.ok(mapOf("saved" to true))
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun Webinar.toDto(saved: Boolean) = WebinarDto(
        id           = id,
        title        = title,
        description  = description,
        speakerName  = speakerName,
        speakerTitle = speakerTitle,
        startDate    = startDate?.format(ISO),
        endDate      = endDate?.format(ISO),
        location     = location,
        joinUrl      = joinUrl,
        thumbnailUrl = thumbnailUrl,
        status       = status.name,
        tags         = tags.toList(),
        organizerName = organizer.displayName,
        saved        = saved,
    )
}
