package com.example.konkat.teampost

import com.example.konkat.hackathon.Hackathon
import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

enum class RequestStatus { PENDING, APPROVED, REJECTED }

@Entity
@Table(name = "team_posts")
class TeamPost(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id", nullable = false)
    val hackathon: Hackathon,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User,

    @Column(nullable = false)
    var title: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    var location: String? = null,
    var maxMembers: Int = 4,

    @ElementCollection
    @CollectionTable(name = "team_post_tech_stack", joinColumns = [JoinColumn(name = "team_post_id")])
    @Column(name = "tech")
    var techStack: MutableList<String> = mutableListOf(),

    @ElementCollection
    @CollectionTable(name = "team_post_looking_for", joinColumns = [JoinColumn(name = "team_post_id")])
    @Column(name = "role")
    var lookingFor: MutableList<String> = mutableListOf(),

    var groupConversationId: Long? = null,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)

@Entity
@Table(
    name = "team_requests",
    uniqueConstraints = [UniqueConstraint(columnNames = ["team_post_id", "requester_id"])]
)
class TeamRequest(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_post_id", nullable = false)
    val teamPost: TeamPost,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    val requester: User,

    var message: String? = null,

    @Enumerated(EnumType.STRING)
    var status: RequestStatus = RequestStatus.PENDING,

    @CreationTimestamp
    val createdAt: LocalDateTime? = null,
)
