import nodemailer from "nodemailer";

function hasSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendOtpEmail({ to, code }) {
  // Mode DEV: si SMTP non configuré, on log l'OTP côté serveur
  if (!hasSmtp()) {
    // eslint-disable-next-line no-console
    console.log(`\n🔐 [SeatGo OTP - DEV] ${to}: ${code} (expire dans ${process.env.OTP_EXPIRES_MIN || 10} min)\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.SMTP_FROM || "SeatGo <no-reply@seatgo.local>";

  await transporter.sendMail({
    from,
    to,
    subject: "Votre code OTP SeatGo",
    text: `Votre code de vérification SeatGo est : ${code}\n\nCe code expire dans ${process.env.OTP_EXPIRES_MIN || 10} minutes.`,
  });
}
