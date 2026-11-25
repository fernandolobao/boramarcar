CREATE TABLE "cron_runs" (
	"task" text NOT NULL,
	"period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cron_runs_task_period_pk" PRIMARY KEY("task","period")
);
