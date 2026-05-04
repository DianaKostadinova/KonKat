package com.example.konkat.post

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/tags")
class TagController(private val postService: PostService) {

    @GetMapping("/trending")
    fun getTrending(): ResponseEntity<List<TrendingTagDto>> =
        ResponseEntity.ok(postService.getTrendingTags())
}
