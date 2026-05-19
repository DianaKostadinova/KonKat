package com.example.konkat.qa

import com.example.konkat.config.PagedResponse
import com.example.konkat.notification.NotificationSender
import com.example.konkat.notification.NotificationType
import com.example.konkat.user.ReputationAction
import com.example.konkat.user.ReputationService
import com.example.konkat.user.User
import com.example.konkat.user.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.format.DateTimeFormatter

private val ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME

@Service
@Transactional
class QuestionService(
    private val questionRepository: QuestionRepository,
    private val answerRepository: AnswerRepository,
    private val questionVoteRepository: QuestionVoteRepository,
    private val answerVoteRepository: AnswerVoteRepository,
    private val userRepository: UserRepository,
    private val notificationSender: NotificationSender,
    private val reputationService: ReputationService,
) {

    fun getAll(currentUserId: Long?, filter: String?): List<QuestionDto> {
        val questions = when (filter) {
            "solved"   -> questionRepository.findBySolvedOrderByCreatedAtDesc(true)
            "unsolved" -> questionRepository.findBySolvedOrderByCreatedAtDesc(false)
            else       -> questionRepository.findAllByOrderByCreatedAtDesc()
        }
        return questions.map { it.toDto(currentUserId, includeAnswers = true) }
    }

    fun getAllPaged(currentUserId: Long?, filter: String?, page: Int, size: Int): PagedResponse<QuestionDto> {
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        val result = when (filter) {
            "solved"   -> questionRepository.findBySolvedOrderByCreatedAtDesc(true, pageable)
            "unsolved" -> questionRepository.findBySolvedOrderByCreatedAtDesc(false, pageable)
            else       -> questionRepository.findAllByOrderByCreatedAtDesc(pageable)
        }
        return PagedResponse.of(result.map { it.toDto(currentUserId, includeAnswers = true) })
    }

    fun create(authorId: Long, req: CreateQuestionRequest): QuestionDto {
        val author = userRepository.findByIdOrNull(authorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val question = questionRepository.save(
            Question(
                author       = author,
                title        = req.title,
                content      = req.content,
                codeLanguage = req.codeLanguage,
                codeSnippet  = req.codeSnippet,
                tags         = req.tags.toMutableList(),
            )
        )
        reputationService.grant(author, ReputationAction.QUESTION)
        return question.toDto(authorId, includeAnswers = true)
    }

    fun addAnswer(questionId: Long, authorId: Long, req: CreateAnswerRequest): AnswerDto {
        val question = questionRepository.findByIdOrNull(questionId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found")
        val author = userRepository.findByIdOrNull(authorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val answer = answerRepository.save(
            Answer(
                question     = question,
                author       = author,
                content      = req.content,
                codeLanguage = req.codeLanguage,
                codeSnippet  = req.codeSnippet,
            )
        )
        reputationService.grant(author, ReputationAction.ANSWER)
        if (question.author.id != authorId) {
            notificationSender.send(
                recipient = question.author,
                actor     = author,
                type      = NotificationType.QA_ANSWER,
                postId    = questionId,
            )
        }
        return answer.toDto(authorId)
    }

    fun voteQuestion(questionId: Long, userId: Long, direction: VoteDirection): VoteResultDto {
        val question = questionRepository.findByIdOrNull(questionId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found")
        val user = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")

        val existing = questionVoteRepository.findByQuestionIdAndUserId(questionId, userId)
        val isNewUpvote = existing == null && direction == VoteDirection.UP
        when {
            existing == null              -> questionVoteRepository.save(QuestionVote(question = question, user = user, direction = direction))
            existing.direction == direction -> questionVoteRepository.delete(existing)
            else                          -> { existing.direction = direction; questionVoteRepository.save(existing) }
        }
        if (isNewUpvote && question.author.id != userId) {
            notificationSender.send(
                recipient = question.author,
                actor     = user,
                type      = NotificationType.QA_VOTE,
                postId    = questionId,
            )
        }

        return VoteResultDto(
            votes    = netQuestionVotes(questionId),
            userVote = questionVoteRepository.findByQuestionIdAndUserId(questionId, userId)?.direction?.name,
        )
    }

    fun voteAnswer(answerId: Long, userId: Long, direction: VoteDirection): VoteResultDto {
        val answer = answerRepository.findByIdOrNull(answerId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Answer not found")
        val user = userRepository.findByIdOrNull(userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")

        val existing = answerVoteRepository.findByAnswerIdAndUserId(answerId, userId)
        val isNewUpvote = existing == null && direction == VoteDirection.UP
        when {
            existing == null              -> answerVoteRepository.save(AnswerVote(answer = answer, user = user, direction = direction))
            existing.direction == direction -> answerVoteRepository.delete(existing)
            else                          -> { existing.direction = direction; answerVoteRepository.save(existing) }
        }
        if (isNewUpvote && answer.author.id != userId) {
            notificationSender.send(
                recipient = answer.author,
                actor     = user,
                type      = NotificationType.QA_VOTE,
                postId    = answer.question.id,
            )
        }

        return VoteResultDto(
            votes    = netAnswerVotes(answerId),
            userVote = answerVoteRepository.findByAnswerIdAndUserId(answerId, userId)?.direction?.name,
        )
    }

    fun acceptAnswer(questionId: Long, answerId: Long, requestingUserId: Long): AnswerDto {
        val question = questionRepository.findByIdOrNull(questionId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found")
        if (question.author.id != requestingUserId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the question author can accept answers")

        answerRepository.findByQuestionIdOrderByIsAcceptedDescCreatedAtAsc(questionId)
            .filter { it.isAccepted }
            .forEach { it.isAccepted = false; answerRepository.save(it) }

        val answer = answerRepository.findByIdOrNull(answerId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Answer not found")
        if (answer.question.id != questionId)
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Answer does not belong to this question")

        answer.isAccepted = true
        question.solved = true
        questionRepository.save(question)
        val saved = answerRepository.save(answer)
        if (answer.author.id != requestingUserId) {
            notificationSender.send(
                recipient = answer.author,
                actor     = question.author,
                type      = NotificationType.QA_ANSWER_ACCEPTED,
                postId    = questionId,
            )
        }
        return saved.toDto(requestingUserId)
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private fun netQuestionVotes(questionId: Long): Int =
        (questionVoteRepository.countByQuestionIdAndDirection(questionId, VoteDirection.UP)
                - questionVoteRepository.countByQuestionIdAndDirection(questionId, VoteDirection.DOWN)).toInt()

    private fun netAnswerVotes(answerId: Long): Int =
        (answerVoteRepository.countByAnswerIdAndDirection(answerId, VoteDirection.UP)
                - answerVoteRepository.countByAnswerIdAndDirection(answerId, VoteDirection.DOWN)).toInt()

    private fun Question.toDto(currentUserId: Long?, includeAnswers: Boolean): QuestionDto {
        val answers = if (includeAnswers)
            answerRepository.findByQuestionIdOrderByIsAcceptedDescCreatedAtAsc(id).map { it.toDto(currentUserId) }
        else emptyList()

        return QuestionDto(
            id           = id,
            author       = author.toQAAuthorDto(),
            title        = title,
            content      = content,
            codeLanguage = codeLanguage,
            codeSnippet  = codeSnippet,
            tags         = tags.toList(),
            votes        = netQuestionVotes(id),
            userVote     = currentUserId?.let { questionVoteRepository.findByQuestionIdAndUserId(id, it)?.direction?.name },
            views        = views,
            answers      = answers,
            answerCount  = answerRepository.countByQuestionId(id).toInt(),
            solved       = solved,
            createdAt    = createdAt.format(ISO),
        )
    }

    private fun Answer.toDto(currentUserId: Long?): AnswerDto = AnswerDto(
        id           = id,
        author       = author.toQAAuthorDto(),
        content      = content,
        codeLanguage = codeLanguage,
        codeSnippet  = codeSnippet,
        votes        = netAnswerVotes(id),
        userVote     = currentUserId?.let { answerVoteRepository.findByAnswerIdAndUserId(id, it)?.direction?.name },
        isAccepted   = isAccepted,
        createdAt    = createdAt.format(ISO),
    )
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

private fun User.toQAAuthorDto() = QAAuthorDto(id = id, name = displayName, title = title)

data class QAAuthorDto(val id: Long, val name: String, val title: String?)

data class QuestionDto(
    val id: Long,
    val author: QAAuthorDto,
    val title: String,
    val content: String,
    val codeLanguage: String?,
    val codeSnippet: String?,
    val tags: List<String>,
    val votes: Int,
    val userVote: String?,
    val views: Long,
    val answers: List<AnswerDto>,
    val answerCount: Int,
    val solved: Boolean,
    val createdAt: String,
)

data class AnswerDto(
    val id: Long,
    val author: QAAuthorDto,
    val content: String,
    val codeLanguage: String?,
    val codeSnippet: String?,
    val votes: Int,
    val userVote: String?,
    val isAccepted: Boolean,
    val createdAt: String,
)

data class VoteResultDto(val votes: Int, val userVote: String?)

// ── Request bodies ────────────────────────────────────────────────────────────

data class CreateQuestionRequest(
    @field:jakarta.validation.constraints.NotBlank(message = "Title must not be blank")
    @field:jakarta.validation.constraints.Size(max = 300, message = "Title must be at most 300 characters")
    val title: String,
    @field:jakarta.validation.constraints.NotBlank(message = "Content must not be blank")
    @field:jakarta.validation.constraints.Size(max = 10000, message = "Content must be at most 10000 characters")
    val content: String,
    @field:jakarta.validation.constraints.Size(max = 50)
    val codeLanguage: String? = null,
    @field:jakarta.validation.constraints.Size(max = 20000)
    val codeSnippet: String? = null,
    @field:jakarta.validation.constraints.Size(max = 10, message = "At most 10 tags allowed")
    val tags: List<String> = emptyList(),
)

data class CreateAnswerRequest(
    @field:jakarta.validation.constraints.NotBlank(message = "Answer content must not be blank")
    @field:jakarta.validation.constraints.Size(max = 10000, message = "Answer must be at most 10000 characters")
    val content: String,
    @field:jakarta.validation.constraints.Size(max = 50)
    val codeLanguage: String? = null,
    @field:jakarta.validation.constraints.Size(max = 20000)
    val codeSnippet: String? = null,
)

data class VoteRequest(val direction: VoteDirection)
