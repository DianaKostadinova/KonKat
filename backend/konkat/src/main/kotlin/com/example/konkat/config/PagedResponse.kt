package com.example.konkat.config

/**
 * Generic paginated response envelope returned by list endpoints that support paging.
 * Frontend can use `hasMore` for "load more" UX without needing to calculate it.
 */
data class PagedResponse<T : Any>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val hasMore: Boolean,
) {
    companion object {
        fun <T : Any> of(page: org.springframework.data.domain.Page<T>): PagedResponse<T> =
            PagedResponse(
                content       = page.content,
                page          = page.number,
                size          = page.size,
                totalElements = page.totalElements,
                totalPages    = page.totalPages,
                hasMore       = !page.isLast,
            )
    }
}
