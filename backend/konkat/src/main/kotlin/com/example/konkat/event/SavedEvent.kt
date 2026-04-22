package com.example.konkat.event

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

enum class EventType { HACKATHON, WEBINAR }

@Entity
@Table(
    name = "saved_events",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_id", "event_type", "event_id"])]
)
class SavedEvent(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    val eventType: EventType,

    @Column(name = "event_id", nullable = false)
    val eventId: Long,

    @CreationTimestamp
    val savedAt: LocalDateTime? = null,
)
