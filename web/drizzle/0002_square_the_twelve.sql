ALTER TABLE "subscribers" ADD COLUMN "perfume_id" text;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "consent_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "consent_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscribers" ADD COLUMN "sent_at" timestamp with time zone;