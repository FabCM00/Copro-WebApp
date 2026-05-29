import { EmailClient } from "@azure/communication-email";
import fs   from "fs";
import path from "path";

const client = new EmailClient(process.env.AZURE_EMAIL_CONNECTION_STRING!);

const FROM    = process.env.EMAIL_FROM!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");

function loadLogoBase64(): string {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "Imagen1.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return `${APP_URL}/Imagen1.png`;
  }
}

const LOGO_URL = loadLogoBase64();

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const link = `${APP_URL}/set-password?token=${token}`;

  const poller = await client.beginSend({
    senderAddress: FROM,
    content: {
      subject: "Recuperación de contraseña — Fondex",
      html: buildEmail({
        preheader: "Restablece tu contraseña de acceso al Portal Fondex.",
        title: "Recuperación de contraseña",
        body: `
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
            Recibimos una solicitud para restablecer la contraseña asociada a esta cuenta.
            Si fuiste tú, haz clic en el botón a continuación.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
            Este enlace es válido por <strong style="color:#012340;">1 hora</strong>.
            Transcurrido ese tiempo deberás solicitar uno nuevo.
          </p>
        `,
        cta: "RESTABLECER CONTRASEÑA",
        link,
        alert: "Si no solicitaste este cambio, ignora este correo. Tu contraseña actual permanece sin cambios.",
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
    ? `<strong style="color:#012340;">${invitedByName}</strong> te ha otorgado acceso`
    : "Has recibido acceso";

  const poller = await client.beginSend({
    senderAddress: FROM,
    content: {
      subject: "Invitación de acceso — Portal Fondex",
      html: buildEmail({
        preheader: "Tienes una invitación para acceder al Portal Fondex.",
        title: "Bienvenido al Portal Fondex",
        body: `
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
            ${inviter} al <strong style="color:#012340;">Portal de Motores de Crédito Fondex</strong>.
            Para activar tu cuenta, crea tu contraseña personal haciendo clic en el botón a continuación.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
            Esta invitación expira en <strong style="color:#012340;">7 días</strong>.
          </p>
        `,
        cta: "CREAR MI CONTRASEÑA",
        link,
        alert: "Si no esperabas esta invitación, ignora este correo. No se realizará ninguna acción.",
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
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#EAECEF;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!--[if !gte mso 9]><!-->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
  <!--<![endif]-->

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EAECEF;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- CARD -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#ffffff;border-radius:4px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.10);max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#012340;padding:0;">
              <!-- Franja naranja superior -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#F29A2E;height:5px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <!-- Logo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:28px 40px 24px;">
                    <img src="${LOGO_URL}"
                         alt="Fondex"
                         width="180"
                         style="display:block;border:0;max-width:180px;height:auto;"/>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="background:#F29A2E;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:44px 48px 36px;">

              <!-- Título -->
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#012340;
                         letter-spacing:-0.3px;line-height:1.3;">
                ${opts.title}
              </h1>

              <!-- Cuerpo -->
              ${opts.body}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 36px;">
                <tr>
                  <td align="center"
                      style="background:#F29A2E;border-radius:3px;">
                    <a href="${opts.link}"
                       style="display:inline-block;padding:15px 36px;
                              color:#012340;font-size:13px;font-weight:700;
                              text-decoration:none;letter-spacing:1.2px;
                              font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                      ${opts.cta}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Separador -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin:0 0 24px;">
                <tr>
                  <td style="border-top:1px solid #E5E7EB;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Alerta -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#FFF8EC;border-left:3px solid #F29A2E;
                            border-radius:2px;margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;font-size:12px;color:#92400E;line-height:1.6;">
                      <strong>Aviso de seguridad:</strong> ${opts.alert}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Enlace directo -->
              <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
                Si el botón no funciona, copia este enlace en tu navegador:<br/>
                <a href="${opts.link}"
                   style="color:#012340;word-break:break-all;">${opts.link}</a>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#F8F9FA;padding:24px 48px;border-top:1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;
                               color:#012340;letter-spacing:1px;text-transform:uppercase;">
                      Fondex &mdash; Portal de Motores de Crédito
                    </p>
                    <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.7;">
                      Este correo fue generado automáticamente. Por favor no respondas a este mensaje.<br/>
                      &copy; ${year} Fondex &middot; Want N&apos; Get &middot; Todos los derechos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- / CARD -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
