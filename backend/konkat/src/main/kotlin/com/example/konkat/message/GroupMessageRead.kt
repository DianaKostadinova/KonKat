package com.example.konkat.message

import jakarta.persistence.*
import org.springframework.data.jpa.repository.JpaRepository

@Entity
@Table(
    name = "group_message_reads",
    uniqueConstraints = [UniqueConstraint(columnNames = ["group_id", "user_id"])]
)
class GroupMessageRead(

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "group_id", nullable = false)
    val groupId: Long,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(nullable = false)
    var lastReadMessageId: Long = 0,
)

interface GroupMessageReadRepository : JpaRepository<GroupMessageRead, Long> {
    fun findByGroupIdAndUserId(groupId: Long, userId: Long): GroupMessageRead?
    fun findByUserIdAndGroupIdIn(userId: Long, groupIds: List<Long>): List<GroupMessageRead>
}
