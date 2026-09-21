CREATE TABLE IF NOT EXISTS "fabric_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'trusted' NOT NULL,
	"source_adapter_id" text,
	"play_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fabric_objects_kind_idx" ON "fabric_objects" USING btree ("kind");
