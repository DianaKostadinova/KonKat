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
class SecurityConfig(private val clerkJwtFilter: ClerkJwtFilter) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain =
        http
            .cors { it.configurationSource(corsSource()) }
            .csrf { it.disable() }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // CORS pre-flight
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    // Posts — public reads
                    .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/**").permitAll()
                    // Questions — public reads
                    .requestMatchers(HttpMethod.GET, "/api/questions", "/api/questions/**").permitAll()
                    // Hackathons & webinars — public reads
                    .requestMatchers(HttpMethod.GET, "/api/hackathons", "/api/hackathons/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/webinars", "/api/webinars/**").permitAll()
                    // Team posts — public reads
                    .requestMatchers(HttpMethod.GET, "/api/team-posts", "/api/team-posts/**").permitAll()
                    // Users — public profile lookup
                    .requestMatchers(HttpMethod.GET, "/api/users/**").permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(clerkJwtFilter, UsernamePasswordAuthenticationFilter::class.java)
            .build()

    /**
     * Standalone CorsFilter registered at highest precedence — runs BEFORE Spring Security
     * so that preflight OPTIONS requests are resolved without hitting the auth layer at all.
     */
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    fun corsFilter(): CorsFilter = CorsFilter(corsSource())

    private fun corsSource(): UrlBasedCorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins    = listOf("http://localhost:4200")
            allowedMethods    = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders    = listOf("*")
            allowCredentials  = true
            maxAge            = 3600L
        }
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
    }
}
