package com.example.konkat.websocket

import com.example.konkat.security.FirebaseJwtService
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.stereotype.Component

@Component
class WebSocketAuthInterceptor(
    private val firebaseJwtService: FirebaseJwtService,
) : ChannelInterceptor {

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*> {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
        if (accessor?.command == StompCommand.CONNECT) {
            val authHeader = accessor.getFirstNativeHeader("Authorization") ?: return message
            val token = authHeader.removePrefix("Bearer ").trim()
            val user  = firebaseJwtService.resolveUser(token) ?: return message
            accessor.user = UsernamePasswordAuthenticationToken(
                user.id.toString(),
                null,
                listOf(SimpleGrantedAuthority("ROLE_USER")),
            )
        }
        return message
    }
}
