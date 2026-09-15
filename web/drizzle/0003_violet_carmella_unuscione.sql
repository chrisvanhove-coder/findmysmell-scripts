CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_token" text NOT NULL,
	"step" text NOT NULL,
	"event" text NOT NULL,
	"answer_code" text,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "funnel_created_idx" ON "funnel_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "funnel_run_idx" ON "funnel_events" USING btree ("run_token");--> statement-breakpoint
CREATE INDEX "funnel_step_idx" ON "funnel_events" USING btree ("step");