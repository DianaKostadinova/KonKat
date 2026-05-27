package com.example.konkat.config

import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
class DbMigrations {

    /**
     * Hibernate's ddl-auto=update never touches existing check constraints or adds missing
     * columns to already-existing tables in all cases. This runner keeps the schema in sync
     * whenever new enum values or columns are added.
     */
    @Bean
    fun applyMigrations(dataSource: DataSource) = ApplicationRunner {
        dataSource.connection.use { conn ->
            conn.createStatement().use { stmt ->

                // saved_events: keep event_type constraint in sync with EventType enum
                stmt.execute("ALTER TABLE saved_events DROP CONSTRAINT IF EXISTS saved_events_event_type_check")
                stmt.execute("""
                    ALTER TABLE saved_events ADD CONSTRAINT saved_events_event_type_check
                    CHECK (event_type::text = ANY(ARRAY[
                        'HACKATHON', 'WEBINAR', 'WEBINAR_ATTEND'
                    ]::text[]))
                """.trimIndent())

                // notifications: keep type constraint in sync with NotificationType enum
                stmt.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check")
                stmt.execute("""
                    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
                    CHECK (type::text = ANY(ARRAY[
                        'FOLLOW', 'POST_LIKE', 'POST_COMMENT', 'POST_SHARE',
                        'PROJECT_LIKE', 'PROJECT_INTEREST', 'PROJECT_MEMBER',
                        'HACKATHON_INVITE', 'HACKATHON_STARTED', 'HACKATHON_REGISTER',
                        'HACKATHON_SAVED', 'TEAM_REQUEST', 'BADGE_AWARDED', 'MESSAGE',
                        'QA_ANSWER', 'QA_ANSWER_ACCEPTED', 'QA_VOTE', 'WEBINAR_ATTEND'
                    ]::text[]))
                """.trimIndent())

                // notifications: add webinar_id column if it doesn't exist yet
                stmt.execute("""
                    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS webinar_id bigint
                """.trimIndent())
            }
        }
    }
}
