package com.example.konkat.workspace

import com.example.konkat.user.User
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(
    name = "workspace_members",
    uniqueConstraints = [UniqueConstraint(columnNames = ["workspace_id", "user_id"])],
)
data class WorkspaceMember(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    val workspace: Workspace,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    var role: String? = null,

    @CreationTimestamp
    val joinedAt: LocalDateTime = LocalDateTime.now(),
)
