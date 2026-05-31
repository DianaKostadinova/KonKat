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

                // users: add notification preference columns if they don't exist yet
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_follow boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_post_like boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_post_comment boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_message boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_hackathon boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_webinar boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_on_qa boolean NOT NULL DEFAULT true")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS show_online_status boolean NOT NULL DEFAULT true")

                // workspaces: add team_post_id for Find-Team workspace linking
                stmt.execute("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS team_post_id bigint")

                // users: add privacy enum columns if they don't exist yet
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility varchar(255) NOT NULL DEFAULT 'PUBLIC'")
                stmt.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_dms varchar(255) NOT NULL DEFAULT 'EVERYONE'")

                // ── Soft delete columns ───────────────────────────────────────────
                stmt.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at timestamp")
                stmt.execute("ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_by_id bigint")
                stmt.execute("ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS deleted_at timestamp")

                // ── Reports table (moderation) ───────────────────────────────────
                stmt.execute("""
                    CREATE TABLE IF NOT EXISTS reports (
                        id bigserial PRIMARY KEY,
                        reporter_id bigint NOT NULL REFERENCES users(id),
                        target_type varchar(50) NOT NULL,
                        target_id bigint NOT NULL,
                        reason varchar(50) NOT NULL,
                        description text,
                        status varchar(50) NOT NULL DEFAULT 'PENDING',
                        reviewed_by_id bigint REFERENCES users(id),
                        moderator_notes text,
                        created_at timestamp DEFAULT now(),
                        reviewed_at timestamp,
                        UNIQUE(reporter_id, target_type, target_id)
                    )
                """.trimIndent())
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)")
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id)")

                // ── Full-text search GIN indexes ─────────────────────────────────
                stmt.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_fts
                    ON users USING gin(to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(username,'') || ' ' || coalesce(bio,'')))
                """.trimIndent())
                stmt.execute("""
                    CREATE INDEX IF NOT EXISTS idx_posts_fts
                    ON posts USING gin(to_tsvector('english', coalesce(content,'')))
                """.trimIndent())
                stmt.execute("""
                    CREATE INDEX IF NOT EXISTS idx_projects_fts
                    ON projects USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')))
                """.trimIndent())
                stmt.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hackathons_fts
                    ON hackathons USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')))
                """.trimIndent())
                stmt.execute("""
                    CREATE INDEX IF NOT EXISTS idx_qa_questions_fts
                    ON qa_questions USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')))
                """.trimIndent())

                // users: drop and recreate check constraints for the enum columns
                stmt.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_profile_visibility_check")
                stmt.execute("""
                    ALTER TABLE users ADD CONSTRAINT users_profile_visibility_check
                    CHECK (profile_visibility::text = ANY(ARRAY['PUBLIC', 'CONNECTIONS', 'PRIVATE']::text[]))
                """.trimIndent())
                stmt.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_allow_dms_check")
                stmt.execute("""
                    ALTER TABLE users ADD CONSTRAINT users_allow_dms_check
                    CHECK (allow_dms::text = ANY(ARRAY['EVERYONE', 'FOLLOWING', 'NOBODY']::text[]))
                """.trimIndent())
            }
        }
    }
}
