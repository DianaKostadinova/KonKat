package com.example.konkat.message

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ConversationRepository : JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c WHERE c.participant1.id = :uid OR c.participant2.id = :uid")
    fun findByParticipant(@Param("uid") uid: Long): List<Conversation>

    fun findByParticipant1IdAndParticipant2Id(p1Id: Long, p2Id: Long): Conversation?
}

interface MessageRepository : JpaRepository<Message, Long> {

    fun findByConversationIdOrderByCreatedAtAsc(conversationId: Long): List<Message>

    fun findByConversationIdAndIdGreaterThanOrderByCreatedAtAsc(
        conversationId: Long,
        afterId: Long,
    ): List<Message>

    fun findTopByConversationIdOrderByCreatedAtDesc(conversationId: Long): Message?

    fun countByConversationIdAndReadFalseAndSenderIdNot(conversationId: Long, senderId: Long): Long
}
