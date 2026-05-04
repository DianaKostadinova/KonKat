package com.example.konkat.websocket

import com.example.konkat.security.ClerkJwtService
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.stereotype.Component

/**
 * Validates the Clerk JWT sent in the STOMP CONNECT frame and sets the
 * WebSocket principal to the user's DB id (as a String). This lets
 * SimpMessagingTemplate route messages via convertAndSendToUser(userId, ...).
 */
@Component
class WebSocketAuthInterceptor(
    private val clerkJwtService: ClerkJwtService,
) : ChannelInterceptor {

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*> {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
        if (accessor?.command == StompCommand.CONNECT) {
            val authHeader = accessor.getFirstNativeHeader("Authorization") ?: return message
            val token = authHeader.removePrefix("Bearer ").trim()
            val user = clerkJwtService.resolveUser(token) ?: return message
            accessor.user = UsernamePasswordAuthenticationToken(
                user.id.toString(),
                null,
                listOf(SimpleGrantedAuthority("ROLE_USER")),
            )
        }
        return message
    }
}
