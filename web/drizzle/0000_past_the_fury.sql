CREATE TABLE "perfumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cms_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archetype" text NOT NULL,
	"name" text NOT NULL,
	"house" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"shop_url" text DEFAULT '' NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"sweet" integer,
	"raw" integer,
	"projection" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perfumes_cms_id_unique" UNIQUE("cms_id")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text NOT NULL,
	"winner" text NOT NULL,
	"secondary" text,
	"scores" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"open_answer" text,
	"consent_research" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"locale" text NOT NULL,
	"archetype" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "perfumes_archetype_idx" ON "perfumes" USING btree ("archetype");--> statement-breakpoint
CREATE INDEX "submissions_created_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_winner_idx" ON "submissions" USING btree ("winner");