package com.example.konkat.workspace

import com.example.konkat.hackathon.Hackathon
import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "workspaces")
data class Workspace(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    var name: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    val createdBy: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hackathon_id")
    val hackathon: Hackathon? = null,

    /** The team name from hackathon registration — used to link participants to this workspace */
    var teamName: String? = null,

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
