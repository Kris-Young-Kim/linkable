DROP TABLE "users";

CREATE TABLE "users" (
	"id"	UUID		NOT NULL,
	"clerk_id"	VARCHAR(255)		NOT NULL,
	"email"	VARCHAR(255)		NOT NULL,
	"name"	VARCHAR(100)		NULL,
	"role"	VARCHAR(50)	DEFAULT 'user'	NULL,
	"points"	INTEGER		NULL,
	"created_at"	TIMESTAMP	DEFAULT now ()	NULL,
	"updated_at"	TIMESTAMP		NULL
);

DROP TABLE "products";

CREATE TABLE "products" (
	"id"	UUID		NOT NULL,
	"name"	VARCHAR(255)		NOT NULL,
	"iso_code"	VARCHAR(50)		NOT NULL,
	"manufacturer"	VARCHAR(100)		NULL,
	"description"	TEXT		NULL,
	"image_url"	TEXT		NULL,
	"purchase_link"	TEXT		NULL,
	"price"	DECIMAL(10, 2)		NULL,
	"category"	VARCHAR(100)		NULL,
	"is_active"	BOOLEAN		NULL,
	"created_at"	TIMESTAMP		NULL
);

DROP TABLE "consultations";

CREATE TABLE "consultations" (
	"id"	UUID		NOT NULL,
	"user_id"	UUID		NULL,
	"title"	VARCHAR(200)		NULL,
	"status"	VARCHAR(50)	DEFAULT 'in_progress'	NULL,
	"created_at"	TIMESTAMP		NULL,
	"id2"	UUID		NOT NULL
);

DROP TABLE "recommendations";

CREATE TABLE "recommendations" (
	"id"	UUID		NOT NULL,
	"consultation_id"	UUID		NULL,
	"product_id"	UUID		NULL,
	"match_reason"	TEXT		NULL,
	"rank"	INTEGER		NULL,
	"is_clicked"	BOOLEAN		NULL,
	"created_at"	TIMESTAMP	DEFAULT now ()	NULL,
	"id2"	UUID		NOT NULL,
	"id3"	UUID		NOT NULL
);

DROP TABLE "ippa_evaluations";

CREATE TABLE "ippa_evaluations" (
	"id"	UUID		NOT NULL,
	"user_id"	UUID		NULL,
	"product_id"	UUID		NULL,
	"recommendation_id"	UUID		NULL,
	"problem_description"	TEXT		NULL,
	"score_importance"	INTEGER		NULL,
	"score_difficulty_pre"	INTEGER		NULL,
	"score_difficulty_post"	INTEGER		NULL,
	"effectiveness_score"	DECIMAL(5, 2)		NULL,
	"feedback_comment"	TEXT		NULL,
	"evaluated_at"	TIMESTAMP	DEFAULT now ()	NULL,
	"id2"	UUID		NOT NULL,
	"id3"	UUID		NOT NULL,
	"id4"	UUID		NOT NULL
);

COMMENT ON COLUMN "ippa_evaluations"."feedback_comment" IS 'EX';

DROP TABLE "chat_messages";

CREATE TABLE "chat_messages" (
	"id"	UUID		NOT NULL,
	"consultation_id"	UUID		NULL,
	"sender"	VARCHAR(20)		NOT NULL,
	"message_text"	TEXT		NOT NULL,
	"created_at"	TIMESTAMP		NULL,
	"id2"	UUID		NOT NULL
);

DROP TABLE "analysis_results";

CREATE TABLE "analysis_results" (
	"id"	UUID		NOT NULL,
	"consultation_id"	UUID		NULL,
	"summary"	TEXT		NULL,
	"icf_codes"	TEXT		NULL,
	"/*"	ERD		NULL,
	"env_factors"	TEXT		NULL,
	"created_at"	TIMESTAMP		NULL,
	"id2"	UUID		NOT NULL
);

ALTER TABLE "users" ADD CONSTRAINT "PK_USERS" PRIMARY KEY (
	"id"
);

ALTER TABLE "products" ADD CONSTRAINT "PK_PRODUCTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "consultations" ADD CONSTRAINT "PK_CONSULTATIONS" PRIMARY KEY (
	"id"
);

ALTER TABLE "recommendations" ADD CONSTRAINT "PK_RECOMMENDATIONS" PRIMARY KEY (
	"id"
);

ALTER TABLE "ippa_evaluations" ADD CONSTRAINT "PK_IPPA_EVALUATIONS" PRIMARY KEY (
	"id"
);

ALTER TABLE "chat_messages" ADD CONSTRAINT "PK_CHAT_MESSAGES" PRIMARY KEY (
	"id"
);

ALTER TABLE "analysis_results" ADD CONSTRAINT "PK_ANALYSIS_RESULTS" PRIMARY KEY (
	"id"
);

ALTER TABLE "consultations" ADD CONSTRAINT "FK_users_TO_consultations_1" FOREIGN KEY (
	"id2"
)
REFERENCES "users" (
	"id"
);

ALTER TABLE "recommendations" ADD CONSTRAINT "FK_consultations_TO_recommendations_1" FOREIGN KEY (
	"id2"
)
REFERENCES "consultations" (
	"id"
);

ALTER TABLE "recommendations" ADD CONSTRAINT "FK_products_TO_recommendations_1" FOREIGN KEY (
	"id3"
)
REFERENCES "products" (
	"id"
);

ALTER TABLE "ippa_evaluations" ADD CONSTRAINT "FK_users_TO_ippa_evaluations_1" FOREIGN KEY (
	"id2"
)
REFERENCES "users" (
	"id"
);

ALTER TABLE "ippa_evaluations" ADD CONSTRAINT "FK_products_TO_ippa_evaluations_1" FOREIGN KEY (
	"id3"
)
REFERENCES "products" (
	"id"
);

ALTER TABLE "ippa_evaluations" ADD CONSTRAINT "FK_recommendations_TO_ippa_evaluations_1" FOREIGN KEY (
	"id4"
)
REFERENCES "recommendations" (
	"id"
);

ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_consultations_TO_chat_messages_1" FOREIGN KEY (
	"id2"
)
REFERENCES "consultations" (
	"id"
);

ALTER TABLE "analysis_results" ADD CONSTRAINT "FK_chat_messages_TO_analysis_results_1" FOREIGN KEY (
	"id2"
)
REFERENCES "chat_messages" (
	"id"
);

