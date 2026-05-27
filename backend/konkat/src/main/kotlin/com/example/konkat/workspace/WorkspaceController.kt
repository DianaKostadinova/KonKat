package com.example.konkat.workspace

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/workspaces")
class WorkspaceController(private val workspaceService: WorkspaceService) {

    @GetMapping
    fun getMyWorkspaces(request: HttpServletRequest): ResponseEntity<List<WorkspaceSummaryDto>> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(workspaceService.getMyWorkspaces(userId))
    }

    @PostMapping
    fun create(
        @RequestBody body: CreateWorkspaceRequest,
        request: HttpServletRequest,
    ): ResponseEntity<WorkspaceSummaryDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(workspaceService.create(userId, body.name))
    }

    @PostMapping("/from-team/{teamPostId}")
    fun openFromTeam(
        @PathVariable teamPostId: Long,
        request: HttpServletRequest,
    ): ResponseEntity<WorkspaceSummaryDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(workspaceService.getOrCreateFromTeamPost(teamPostId, userId))
    }

    @GetMapping("/{id}")
    fun getWorkspace(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<WorkspaceDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(workspaceService.getWorkspace(id, userId))
    }

    @PostMapping("/{id}/tasks")
    fun addTask(
        @PathVariable id: Long,
        @RequestBody body: CreateTaskRequest,
        request: HttpServletRequest,
    ): ResponseEntity<WorkspaceTaskDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(workspaceService.addTask(id, userId, body))
    }

    @PatchMapping("/{id}/tasks/{taskId}")
    fun updateTask(
        @PathVariable id: Long,
        @PathVariable taskId: Long,
        @RequestBody body: UpdateTaskRequest,
        request: HttpServletRequest,
    ): ResponseEntity<WorkspaceTaskDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(workspaceService.updateTask(id, taskId, userId, body))
    }

    @DeleteMapping("/{id}/tasks/{taskId}")
    fun deleteTask(
        @PathVariable id: Long,
        @PathVariable taskId: Long,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        val userId = request.getAttribute("userId") as Long
        workspaceService.deleteTask(id, taskId, userId)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/messages")
    fun getMessages(
        @PathVariable id: Long,
        request: HttpServletRequest,
    ): ResponseEntity<List<WorkspaceMessageDto>> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(workspaceService.getMessages(id, userId))
    }

    @PostMapping("/{id}/messages")
    fun sendMessage(
        @PathVariable id: Long,
        @RequestBody body: SendMessageRequest,
        request: HttpServletRequest,
    ): ResponseEntity<WorkspaceMessageDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(workspaceService.sendMessage(id, userId, body.content))
    }
}
