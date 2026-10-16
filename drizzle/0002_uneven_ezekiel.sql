CREATE TABLE "moment_styles" (
	"entry_id" uuid PRIMARY KEY NOT NULL,
	"style" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moment_styles" ADD CONSTRAINT "moment_styles_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;