CREATE TABLE "question_open_answers" (
	"submission_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_open_answers_submission_id_question_id_pk" PRIMARY KEY("submission_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "question_open_answers" ADD CONSTRAINT "question_open_answers_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_open_question_idx" ON "question_open_answers" USING btree ("question_id","created_at");