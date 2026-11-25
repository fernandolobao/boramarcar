CREATE INDEX "events_reminder_due_idx" ON "events" USING btree ("starts_at") WHERE "events"."status" = 'scheduled' and "events"."reminder_sent_at" is null;--> statement-breakpoint
CREATE INDEX "notifications_group_kind_idx" ON "notifications" USING btree ("group_id","kind");--> statement-breakpoint
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");