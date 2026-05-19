package com.example.konkat.user

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Reputation points earned from contributing content.
 *
 * Keep the math here so individual services don't drift. If you later add
 * "+1 on upvote received" / "+15 on accepted answer", add new actions to the
 * enum and call `grant(...)` from the relevant place.
 */
enum class ReputationAction(val points: Int) {
    POST(5),
    COMMENT(2),
    QUESTION(10),
    ANSWER(5),
    MINIGAME_SOLVE(3),
}

@Service
class ReputationService(private val userRepository: UserRepository) {

    /**
     * Increment the user's reputation. Best-effort — if the user row was
     * just deleted, swallow rather than fail the parent transaction
     * (the create that triggered this is more important than the +N).
     */
    @Transactional
    fun grant(user: User, action: ReputationAction) {
        user.reputation += action.points
        userRepository.save(user)
    }
}
