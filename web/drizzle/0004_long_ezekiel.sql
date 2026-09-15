ALTER TABLE "submissions" ADD COLUMN "browser_key" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "run_index" integer;--> statement-breakpoint
CREATE INDEX "submissions_browser_idx" ON "submissions" USING btree ("browser_key","created_at");