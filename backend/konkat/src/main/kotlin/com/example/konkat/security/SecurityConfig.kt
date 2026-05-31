package com.example.konkat.security

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.CorsFilter

@Configuration
@EnableWebSecurity
class SecurityConfig(private val firebaseJwtFilter: FirebaseJwtFilter) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain =
        http
            .cors { it.disable() }
            .csrf { it.disable() }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/questions", "/api/questions/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/hackathons", "/api/hackathons/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/webinars", "/api/webinars/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/team-posts", "/api/team-posts/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                    .requestMatchers("/ws/**").permitAll()
                    // Reports: GET stats + list is admin-only (enforced in controller)
                    // but the route itself requires authentication
                    .anyRequest().authenticated()
            }
            .addFilterBefore(firebaseJwtFilter, UsernamePasswordAuthenticationFilter::class.java)
            .build()

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    fun corsFilter(): CorsFilter = CorsFilter(corsSource())

    private fun corsSource(): UrlBasedCorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins   = listOf("http://localhost:4200", "http://localhost")
            allowedMethods   = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders   = listOf("*")
            allowCredentials = true
            maxAge           = 3600L
        }
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
    }
}
