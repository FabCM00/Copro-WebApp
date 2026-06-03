import { EmailClient } from "@azure/communication-email";

const client = new EmailClient(process.env.AZURE_EMAIL_CONNECTION_STRING!);

const FROM = process.env.EMAIL_FROM!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");

const BRAND = "CoproDigital";

const LOGO_URL = "https://i.imgur.com/kBwQizJ.png";

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${APP_URL}/set-password?token=${token}`;

  const poller = await client.beginSend({
    senderAddress: FROM,
    content: {
      subject: `Recuperación de contraseña — ${BRAND}`,
      html: buildEmail({
        preheader: `Restablece tu contraseña de acceso a la plataforma ${BRAND}.`,
        title: "Recuperación de contraseña",
        body: `
          <p style="margin:0 0 16px;font-family:Roboto,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#3F4754;">
            Recibimos una solicitud para restablecer la contraseña asociada a esta cuenta.
            Si fuiste tú, utiliza el botón a continuación para continuar.
          </p>
          <p style="margin:0 0 28px;font-family:Roboto,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#3F4754;">
            Este enlace es válido por <strong style="color:#1A2433;">1 hora</strong>.
            Transcurrido ese tiempo deberás solicitar uno nuevo.
          </p>
        `,
        cta: "Restablecer contraseña",
        link,
        alert:
          "Si no solicitaste este cambio, ignora este correo. Tu contraseña actual permanece sin cambios.",
      }),
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
  const link = `${APP_URL}/set-password?token=${token}&type=invite`;
  const inviter = invitedByName
    ? `<strong style="color:#1A2433;">${invitedByName}</strong> te ha otorgado acceso`
    : "Has recibido acceso";

  const poller = await client.beginSend({
    senderAddress: FROM,
    content: {
      subject: `Invitación de acceso — Plataforma ${BRAND}`,
      html: buildEmail({
        preheader: `Tienes una invitación para acceder a la plataforma ${BRAND}.`,
        title: `Bienvenido a ${BRAND}`,
        body: `
          <p style="margin:0 0 16px;font-family:Roboto,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#3F4754;">
            ${inviter} a la <strong style="color:#1A2433;">Plataforma ${BRAND}</strong>.
            Para activar tu cuenta, crea tu contraseña personal mediante el botón a continuación.
          </p>
          <p style="margin:0 0 28px;font-family:Roboto,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#3F4754;">
            Esta invitación expira en <strong style="color:#1A2433;">7 días</strong>.
          </p>
        `,
        cta: "Crear mi contraseña",
        link,
        alert:
          "Si no esperabas esta invitación, ignora este correo. No se realizará ninguna acción.",
      }),
    },
    recipients: { to: [{ address: to }] },
  });
  await poller.pollUntilDone();
}

function buildEmail(opts: {
  preheader: string;
  title: string;
  body: string;
  cta: string;
  link: string;
  alert: string;
}): string {
  const year = new Date().getFullYear();
  const FONT = "Roboto,'Segoe UI',Helvetica,Arial,sans-serif";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting" content=""/>
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"/>
  <title>${opts.title}</title>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&amp;display=swap" rel="stylesheet" type="text/css"/>
  <!--<![endif]-->
  <style type="text/css">
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table{border-collapse:collapse!important;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    body{margin:0!important;padding:0!important;width:100%!important;}
    @media (max-width:480px){
      .card{padding:32px 24px 40px 24px!important;}
      .btn a{display:block!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#EDEEF0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

  <!-- Preheader oculto -->
  <div style="display:none;font-size:1px;color:#EDEEF0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${opts.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDEEF0;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- CARD -->
          <tr>
            <td class="card" style="background-color:#FFFFFF;border-radius:14px;padding:48px 50px 56px 50px;box-shadow:0 1px 4px rgba(26,36,51,0.06);">

              <!-- Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 36px 0;">
                    <img src="${LOGO_URL}" alt="${BRAND}" width="150" style="display:block;width:150px;max-width:150px;height:auto;"/>
                  </td>
                </tr>
              </table>

              <!-- Título -->
              <h1 style="margin:0 0 24px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:#1A2433;letter-spacing:-0.2px;">
                ${opts.title}
              </h1>

              <!-- Cuerpo -->
              ${opts.body}

              <!-- CTA (botón tipo píldora) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td class="btn" align="center" style="background-color:#1A2433;border-radius:44px;">
                    <a href="${opts.link}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:15px;font-weight:700;line-height:20px;color:#FFFFFF;text-decoration:none;">
                      ${opts.cta}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Enlace alternativo -->
              <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:1.6;color:#7A828E;">
                Si el botón no funciona, copia y pega esta dirección en tu navegador:
              </p>
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${opts.link}" style="color:#2563EB;text-decoration:underline;">${opts.link}</a>
              </p>

              <!-- Separador -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 0;">
                    <div style="height:1px;line-height:1px;font-size:1px;background-color:#E7E9ED;">&nbsp;</div>
                  </td>
                </tr>
              </table>

              <!-- Nota de seguridad -->
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.7;color:#7A828E;">
                <strong style="color:#1A2433;">Aviso de seguridad:</strong> ${opts.alert}
              </p>

            </td>
          </tr>

          <!-- FOOTER (fuera de la tarjeta) -->
          <tr>
            <td align="center" style="padding:24px 20px 0;">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:600;color:#1A2433;letter-spacing:0.8px;text-transform:uppercase;">
                ${BRAND} &mdash; Plataforma de Motores de Crédito
              </p>
              <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.7;color:#9AA1AB;">
                Este correo fue generado automáticamente. Por favor no respondas a este mensaje.<br/>
                &copy; ${year} ${BRAND} &middot; Want N&apos; Get &middot; Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}