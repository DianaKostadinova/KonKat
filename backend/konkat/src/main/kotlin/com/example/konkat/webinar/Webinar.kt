package com.example.konkat.webinar

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

enum class WebinarStatus { DRAFT, UPCOMING, LIVE, ENDED, CANCELLED }

@Entity
@Table(name = "webinars")
class Webinar(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    val organizer: User,

    @Column(nullable = false)
    var title: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    var speakerName: String? = null,
    var speakerTitle: String? = null,

    var startDate: LocalDateTime? = null,
    var endDate: LocalDateTime? = null,

    var joinUrl: String? = null,
    var location: String? = "Online",

    @Column(columnDefinition = "TEXT")
    var thumbnailUrl: String? = null,

    @Enumerated(EnumType.STRING)
    var status: WebinarStatus = WebinarStatus.DRAFT,

    @ElementCollection
    @CollectionTable(name = "webinar_tags", joinColumns = [JoinColumn(name = "webinar_id")])
    @Column(name = "tag")
    var tags: MutableList<String> = mutableListOf(),

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
