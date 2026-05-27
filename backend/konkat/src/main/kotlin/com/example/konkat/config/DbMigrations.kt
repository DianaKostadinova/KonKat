package com.example.konkat.config

import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
class DbMigrations {

    /**
     * Keeps the saved_events_event_type_check constraint in sync with the EventType enum.
     * Hibernate's ddl-auto=update never touches existing check constraints, so new enum
     * values would silently fail at insert time without this.
     */
    @Bean
    fun fixEventTypeConstraint(dataSource: DataSource) = ApplicationRunner {
        dataSource.connection.use { conn ->
            conn.createStatement().use { stmt ->
                stmt.execute("""
                    ALTER TABLE saved_events
                        DROP CONSTRAINT IF EXISTS saved_events_event_type_check
                """.trimIndent())
                stmt.execute("""
                    ALTER TABLE saved_events
                        ADD CONSTRAINT saved_events_event_type_check
                        CHECK (event_type::text = ANY(ARRAY[
                            'HACKATHON',
                            'WEBINAR',
                            'WEBINAR_ATTEND'
                        ]::text[]))
                """.trimIndent())
            }
        }
    }
}
