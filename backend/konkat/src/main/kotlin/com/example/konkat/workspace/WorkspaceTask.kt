package com.example.konkat.workspace

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

enum class TaskStatus { TODO, INPROGRESS, DONE }
enum class TaskPriority { LOW, MEDIUM, HIGH }

@Entity
@Table(name = "workspace_tasks")
data class WorkspaceTask(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    val workspace: Workspace,

    var title: String,

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    var assignee: String? = null,

    @Enumerated(EnumType.STRING)
    var status: TaskStatus = TaskStatus.TODO,

    @Enumerated(EnumType.STRING)
    var priority: TaskPriority = TaskPriority.MEDIUM,

    @CreationTimestamp
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
