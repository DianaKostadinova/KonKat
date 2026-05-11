package com.example.konkat.message

import jakarta.servlet.http.HttpServletRequest
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.nio.file.Files
import java.nio.file.Paths
import java.util.UUID

@RestController
@RequestMapping("/api/messages")
class FileUploadController(
    @Value("\${app.upload-dir:uploads/chat}") private val uploadDir: String,
) {

    @PostMapping("/upload", consumes = ["multipart/form-data"])
    fun uploadFile(
        @RequestParam("file") file: MultipartFile,
        request: HttpServletRequest,
    ): ResponseEntity<Map<String, String>> {
        if (file.isEmpty) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file")
        val maxBytes = 10 * 1024 * 1024L
        if (file.size > maxBytes) throw ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Max 10 MB")

        val original = file.originalFilename?.replace(Regex("[^a-zA-Z0-9._-]"), "_") ?: "file"
        val ext = original.substringAfterLast('.', "")
        val stored = if (ext.isNotBlank()) "${UUID.randomUUID()}.$ext" else UUID.randomUUID().toString()

        val dir = Paths.get(uploadDir).toAbsolutePath()
        Files.createDirectories(dir)
        file.transferTo(dir.resolve(stored).toFile())

        val url = "/uploads/chat/$stored"
        return ResponseEntity.ok(mapOf("url" to url, "fileName" to original))
    }
}
