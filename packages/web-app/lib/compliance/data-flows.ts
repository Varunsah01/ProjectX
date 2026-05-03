export interface DataFlow {
  provider: string;
  purpose: string;
  dataCategories: string[];
  region: string;
  crossBorder: boolean;
  dpaUrl?: string;
}

export const DATA_FLOWS: DataFlow[] = [
  {
    provider: "Razorpay",
    purpose: "Payment processing (orders, refunds, webhooks)",
    dataCategories: [
      "Customer name",
      "Email",
      "Phone",
      "Payment amount",
      "Invoice reference",
    ],
    region: "India",
    crossBorder: false,
    dpaUrl: "https://razorpay.com/privacy/",
  },
  {
    provider: "MSG91",
    purpose: "OTP verification, SMS & WhatsApp notifications",
    dataCategories: ["Phone number", "Message content", "OTP codes"],
    region: "India",
    crossBorder: false,
    dpaUrl: "https://msg91.com/privacy-policy",
  },
  {
    provider: "SMTP Provider",
    purpose: "Transactional email delivery",
    dataCategories: [
      "Email address",
      "Customer name",
      "Invoice details",
      "Notification content",
    ],
    region: "Configurable (SMTP_HOST)",
    crossBorder: true,
  },
  {
    provider: "AWS S3",
    purpose: "File storage (proof images, data exports, documents)",
    dataCategories: [
      "Uploaded files",
      "Export archives",
      "Job proof images",
    ],
    region: "Configurable (S3_REGION env)",
    crossBorder: true,
    dpaUrl: "https://aws.amazon.com/compliance/data-privacy/",
  },
  {
    provider: "Sentry",
    purpose: "Error monitoring and performance tracking",
    dataCategories: [
      "Error stack traces",
      "IP addresses",
      "User agent strings",
      "Request metadata",
    ],
    region: "US (sentry.io)",
    crossBorder: true,
    dpaUrl: "https://sentry.io/privacy/",
  },
  {
    provider: "Upstash Redis",
    purpose: "Rate limiting and request throttling",
    dataCategories: ["IP addresses", "Request counts", "Rate limit keys"],
    region: "Configurable (UPSTASH_REDIS_REST_URL)",
    crossBorder: true,
    dpaUrl: "https://upstash.com/trust/privacy",
  },
  {
    provider: "Neon (PostgreSQL)",
    purpose: "Primary database — all personal data",
    dataCategories: [
      "All user and customer personal data",
      "Financial records",
      "Service history",
    ],
    region: "Checked via EXPECTED_DB_REGION env",
    crossBorder: false,
    dpaUrl: "https://neon.tech/privacy",
  },
];
