package com.example.konkat.qa

import com.example.konkat.config.PagedResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/questions")
class QuestionController(private val questionService: QuestionService) {

    @GetMapping
    fun getAll(
        @RequestParam(required = false) filter: String?,
        @RequestParam(required = false) page: Int?,
        @RequestParam(required = false) size: Int?,
        request: HttpServletRequest,
    ): ResponseEntity<*> {
        val userId = request.getAttribute("userId") as? Long
        return if (page != null || size != null) {
            ResponseEntity.ok(questionService.getAllPaged(userId, filter, page ?: 0, size ?: 20))
        } else {
            ResponseEntity.ok(questionService.getAll(userId, filter))
        }
    }

    @PostMapping
    fun create(
        @Valid @RequestBody body: CreateQuestionRequest,
        request: HttpServletRequest,
    ): ResponseEntity<QuestionDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(questionService.create(userId, body))
    }

    @PostMapping("/{id}/answers")
    fun addAnswer(
        @PathVariable id: Long,
        @Valid @RequestBody body: CreateAnswerRequest,
        request: HttpServletRequest,
    ): ResponseEntity<AnswerDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.status(HttpStatus.CREATED).body(questionService.addAnswer(id, userId, body))
    }

    @PostMapping("/{id}/vote")
    fun voteQuestion(
        @PathVariable id: Long,
        @RequestBody body: VoteRequest,
        request: HttpServletRequest,
    ): ResponseEntity<VoteResultDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(questionService.voteQuestion(id, userId, body.direction))
    }

    @PostMapping("/{questionId}/answers/{answerId}/vote")
    fun voteAnswer(
        @PathVariable questionId: Long,
        @PathVariable answerId: Long,
        @RequestBody body: VoteRequest,
        request: HttpServletRequest,
    ): ResponseEntity<VoteResultDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(questionService.voteAnswer(answerId, userId, body.direction))
    }

    @PostMapping("/{questionId}/answers/{answerId}/accept")
    fun acceptAnswer(
        @PathVariable questionId: Long,
        @PathVariable answerId: Long,
        request: HttpServletRequest,
    ): ResponseEntity<AnswerDto> {
        val userId = request.getAttribute("userId") as Long
        return ResponseEntity.ok(questionService.acceptAnswer(questionId, answerId, userId))
    }
}
