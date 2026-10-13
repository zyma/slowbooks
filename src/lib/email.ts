import { Resend } from "resend";
import { env } from "./env";

type Mail = { to: string; subject: string; html: string; text: string };

/** Sends email through Resend. Without an API key it prints the mail to the console (dev). */
export async function sendMail(mail: Mail) {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[mail] to: ${mail.to}\n[mail] subject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...mail });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
