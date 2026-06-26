import { EmailClient } from "@azure/communication-email";
import { render } from "react-email";
import * as React from "react";
import WantInvitationEmail from "@/emails/copro-invitation";
import WantPasswordRecoveryEmail from "@/emails/copro-password-reset";

const getEmailClient = () => {
  const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;
  if (!connectionString) {
    console.warn("AZURE_EMAIL_CONNECTION_STRING is missing");
  }
  return new EmailClient(connectionString ?? "");
};

const getFromEmail = () => process.env.EMAIL_FROM ?? "";
const getAppUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  userFirstname?: string,
): Promise<void> {
  const link = `${getAppUrl()}/set-password?token=${token}`;

  const html = await render(<WantPasswordRecoveryEmail resetPasswordLink={link} userFirstname={userFirstname} />);

  const client = getEmailClient();
  const poller = await client.beginSend({
    senderAddress: getFromEmail(),
    content: {
      subject: "Recuperación de contraseña — WANT TECH 4 ALL",
      html,
    },
    recipients: { to: [{ address: to }] },
  });
  await poller.pollUntilDone();
}

export async function sendInvitationEmail(
  to: string,
  token: string,
  invitedByName?: string,
): Promise<void> {
  const link = `${getAppUrl()}/set-password?token=${token}&type=invite`;

  const html = await render(
    <WantInvitationEmail
      acceptInvitationLink={link}
      inviterName={invitedByName ?? "Un administrador"}
      organizationName="WANT N' GET"
    />,
  );

  const client = getEmailClient();
  const poller = await client.beginSend({
    senderAddress: getFromEmail(),
    content: {
      subject: "Invitación de acceso — WANT TECH 4 ALL",
      html,
    },
    recipients: { to: [{ address: to }] },
  });
  await poller.pollUntilDone();
}