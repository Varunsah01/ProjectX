import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 0),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.FROM_EMAIL,
  };
}

function isEmailConfigured() {
  const config = getSmtpConfig();
  return Boolean(
    config.host &&
      config.port &&
      config.from &&
      ((config.user && config.password) || (!config.user && !config.password))
  );
}

function getTransporter() {
  if (!isEmailConfigured()) return null;

  if (!transporter) {
    const config = getSmtpConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth:
        config.user && config.password
          ? { user: config.user, pass: config.password }
          : undefined,
    });
  }

  return transporter;
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
) {
  const mailer = getTransporter();
  const { from } = getSmtpConfig();

  if (!mailer || !from) {
    console.warn("[landing/email] Skipped — SMTP not configured.");
    return { skipped: true as const };
  }

  return mailer.sendMail({ from, to, subject, html });
}
