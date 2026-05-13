package com.example.konkat.config

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.server.ResponseStatusException

data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
    val fieldErrors: Map<String, String> = emptyMap(),
)

@RestControllerAdvice
class GlobalExceptionHandler {

    /** Validation failures from @Valid on @RequestBody */
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ApiError> {
        val fields = ex.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "invalid") }
        return ResponseEntity
            .badRequest()
            .body(ApiError(400, "Validation Failed", "One or more fields are invalid", fields))
    }

    /** Explicit HTTP errors thrown via ResponseStatusException */
    @ExceptionHandler(ResponseStatusException::class)
    fun handleResponseStatus(ex: ResponseStatusException): ResponseEntity<ApiError> {
        val status = ex.statusCode.value()
        return ResponseEntity
            .status(ex.statusCode)
            .body(ApiError(status, ex.reason ?: HttpStatus.valueOf(status).reasonPhrase, ex.reason ?: ""))
    }

    /** Catch-all for unexpected server errors */
    @ExceptionHandler(Exception::class)
    fun handleGeneric(ex: Exception): ResponseEntity<ApiError> {
        return ResponseEntity
            .internalServerError()
            .body(ApiError(500, "Internal Server Error", ex.message ?: "An unexpected error occurred"))
    }
}
