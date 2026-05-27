package com.example.konkat.event

import com.example.konkat.hackathon.HackathonRepository
import com.example.konkat.webinar.WebinarRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'")

data class SavedEventDto(
    val id: Long,
    val type: String,       // "HACKATHON" or "WEBINAR"
    val title: String,
    val startDate: String?,
    val endDate: String?,
    val location: String?,
    val tags: List<String>,
)

@RestController
@RequestMapping("/api/events")
@Transactional
class EventController(
    private val savedEventRepository: SavedEventRepository,
    private val hackathonRepository: HackathonRepository,
    private val webinarRepository: WebinarRepository,
) {

    /**
     * GET /api/events/saved
     * Returns all saved upcoming events (hackathons + webinars) for the
     * authenticated user, sorted by start date ascending.
     */
    @GetMapping("/saved")
    fun getSavedUpcoming(request: HttpServletRequest): ResponseEntity<List<SavedEventDto>> {
        val userId = request.getAttribute("userId") as Long
        val now    = LocalDateTime.now()

        val result = savedEventRepository.findByUserId(userId).mapNotNull { saved ->
            when (saved.eventType) {
                EventType.HACKATHON ->
                    hackathonRepository.findById(saved.eventId).orElse(null)
                        ?.takeIf { it.startDate == null || it.startDate!!.isAfter(now) }
                        ?.let { h ->
                            SavedEventDto(
                                id        = h.id,
                                type      = "HACKATHON",
                                title     = h.title,
                                startDate = h.startDate?.format(ISO),
                                endDate   = h.endDate?.format(ISO),
                                location  = h.location,
                                tags      = h.tags.toList(),
                            )
                        }

                EventType.WEBINAR, EventType.WEBINAR_ATTEND ->
                    webinarRepository.findById(saved.eventId).orElse(null)
                        ?.takeIf { it.startDate == null || it.startDate!!.isAfter(now) }
                        ?.let { w ->
                            SavedEventDto(
                                id        = w.id,
                                type      = "WEBINAR",
                                title     = w.title,
                                startDate = w.startDate?.format(ISO),
                                endDate   = w.endDate?.format(ISO),
                                location  = w.location,
                                tags      = w.tags.toList(),
                            )
                        }
            }
        }.sortedBy { it.startDate }

        return ResponseEntity.ok(result)
    }
}
