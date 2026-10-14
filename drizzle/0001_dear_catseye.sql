ALTER TABLE "entries" ALTER COLUMN "book_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "position" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_anonymous" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "share_id" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "voice_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "waveform" jsonb;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_user_id_idx" ON "entries" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_share_id_unique" UNIQUE("share_id");