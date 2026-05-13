package com.example.konkat.project

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ProjectRepository : JpaRepository<Project, Long> {
    fun findByTitleContainingIgnoreCase(title: String): List<Project>
    fun findByOwnerId(ownerId: Long): List<Project>
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Project>
    fun countByOwnerId(ownerId: Long): Long
}
