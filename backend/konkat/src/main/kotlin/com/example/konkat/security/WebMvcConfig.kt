package com.example.konkat.security

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import java.nio.file.Paths

@Configuration
class WebMvcConfig(
    @Value("\${app.upload-dir:uploads/chat}") private val uploadDir: String,
) : WebMvcConfigurer {

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        val absPath = Paths.get(uploadDir).toAbsolutePath().normalize()
        registry.addResourceHandler("/uploads/chat/**")
            .addResourceLocations("file:$absPath/")
    }
}
