import nodemailer from "nodemailer";

function hasSmtp() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

export async function sendOtpEmail({ to, code }) {
  // Mode DEV: si SMTP non configuré, on log l'OTP côté serveur
  if (!hasSmtp()) {
    console.log(
      `\n🔐 [SeatGo OTP - DEV] ${to}: ${code} (expire dans ${
        process.env.OTP_EXPIRES_MIN || 10
      } min)\n`
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT);
  const secure = port === 465; // 465 = SSL direct, 587 = STARTTLS

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App Password (16 chars)
    },
    // anti "Unexpected socket close"
    connectionTimeout: 60_000,
    socketTimeout: 60_000,
  });

  // utile pour voir si c'est réseau/TLS/auth
  try {
    await transporter.verify();
    console.log("✅ SMTP prêt");
  } catch (e) {
    console.error("❌ SMTP verify error:", e?.message || e);
    throw e;
  }

  const from = process.env.SMTP_FROM || `SeatGo <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Votre code OTP SeatGo",
    text: `Votre code de vérification SeatGo est : ${code}\n\nCe code expire dans ${
      process.env.OTP_EXPIRES_MIN || 10
    } minutes.`,
  });
}