package com.example.konkat.event

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface SavedEventRepository : JpaRepository<SavedEvent, Long> {
    fun findByUserId(userId: Long): List<SavedEvent>
    fun existsByUserIdAndEventTypeAndEventId(userId: Long, eventType: EventType, eventId: Long): Boolean
    fun findByUserIdAndEventTypeAndEventId(userId: Long, eventType: EventType, eventId: Long): SavedEvent?
    fun findAllByEventTypeAndEventId(eventType: EventType, eventId: Long): List<SavedEvent>
}
