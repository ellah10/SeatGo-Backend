import nodemailer from "nodemailer";

let cachedTransporter = null;
let transporterChecked = false;

function getEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : fallback;
}

function hasSmtp() {
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");
  const service = getEnv("SMTP_SERVICE");
  const host = getEnv("SMTP_HOST");

  return Boolean(user && pass && (service || host));
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function getOtpTemplate(code, expiresMin) {
  const subject = "Votre code OTP SeatGo";

  const text = `Bonjour,\n\nVotre code de vérification SeatGo est : ${code}\n\nCe code expire dans ${expiresMin} minute(s).\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px;color:#1e4b9b;">Code de vérification SeatGo</h2>
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 12px;">Voici votre code OTP pour confirmer votre compte SeatGo :</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#27b36a;margin:20px 0;">
        ${code}
      </div>
      <p style="margin:12px 0 0;color:#6b7280;">
        Ce code expire dans ${expiresMin} minute(s).
      </p>
      <p style="margin:8px 0 0;color:#6b7280;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
      </p>
    </div>
  `;

  return { subject, text, html };
}

function getFromAddress() {
  return (
    getEnv("SMTP_FROM") ||
    getEnv("MAIL_FROM") ||
    (getEnv("SMTP_USER")
      ? `SeatGo <${getEnv("SMTP_USER")}>`
      : "SeatGo <noreply@seatgo.app>")
  );
}

function buildSmtpConfig() {
  const service = getEnv("SMTP_SERVICE");
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");

  if (service) {
    return {
      service,
      auth: {
        user,
        pass,
      },
    };
  }

  const host = getEnv("SMTP_HOST");
  const port = Number(getEnv("SMTP_PORT", "587") || 587);
  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? parseBoolean(process.env.SMTP_SECURE, port === 465)
      : port === 465;

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 60_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
  };
}

function getSmtpTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(buildSmtpConfig());
  }

  return cachedTransporter;
}

export async function warmupMailer() {
  if (!hasSmtp() || transporterChecked) return;

  const transporter = getSmtpTransporter();
  await transporter.verify();
  transporterChecked = true;
  console.log(" Nodemailer/SMTP prêt");
}

async function sendWithSmtp({ to, subject, text, html }) {
  const transporter = getSmtpTransporter();

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });

  console.log(
    ` OTP email envoyé à ${to}`,
    info?.messageId ? `- ${info.messageId}` : ""
  );
}

export async function sendOtpEmail({ to, code }) {
  if (!hasSmtp()) {
    throw new Error(
      "Configuration Nodemailer manquante. Configure SMTP_SERVICE/SMTP_USER/SMTP_PASS ou SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS."
    );
  }

  const expiresMin = Number(getEnv("OTP_EXPIRES_MIN", "10") || 10);
  const { subject, text, html } = getOtpTemplate(code, expiresMin);

  try {
    await sendWithSmtp({ to, subject, text, html });
  } catch (error) {
    console.error("Nodemailer/SMTP send failed:", error?.message || error);
    throw error;
  }
}

export function hasEmailProviderConfigured() {
  return hasSmtp();
}