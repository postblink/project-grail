/**
 * Email templates for transactional mail.
 *
 * Constraints: email clients are stuck in 1999. Use tables for layout, inline
 * all styles, stick to a system font stack, cap width at 600px. Keep a plain-
 * text fallback for clients that block HTML.
 */

interface MagicLinkParams {
  url: string;
  host: string;
}

const BRAND = {
  bg: "#09090b",           // zinc-950
  panel: "#18181b",        // zinc-900
  panelBorder: "#27272a",  // zinc-800
  text: "#f4f4f5",         // zinc-100
  textMuted: "#a1a1aa",    // zinc-400
  textDim: "#71717a",      // zinc-500
  amber: "#C7B377",        // brand gold (matches the site)
  amberDark: "#a8945e",
  amberOnDark: "#fbbf24",  // amber-400 for text on dark
} as const;

export function magicLinkHtml({ url, host }: MagicLinkParams): string {
  const escapedUrl = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>Sign in to Project Grail</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <!-- preheader (hidden, shown in inbox preview) -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
      Your one-time sign-in link for Project Grail.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
            <!-- Logo / brand bar -->
            <tr>
              <td style="padding:0 0 24px 0;">
                <div style="font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.text};">
                  Project <span style="color:${BRAND.amber};">Grail</span>
                </div>
              </td>
            </tr>

            <!-- Main card -->
            <tr>
              <td style="background:${BRAND.panel};border:1px solid ${BRAND.panelBorder};border-radius:12px;padding:32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:600;color:${BRAND.text};line-height:1.3;">
                  Sign in to Project Grail
                </h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:${BRAND.textMuted};line-height:1.6;">
                  Click the button below to sign in. This link works once and expires in 24 hours.
                </p>

                <!-- CTA button (table-based for Outlook compatibility) -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:8px;background:${BRAND.amber};">
                      <a href="${escapedUrl}"
                         style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:${BRAND.bg};text-decoration:none;border-radius:8px;">
                        Sign in
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 8px 0;font-size:12px;color:${BRAND.textDim};">
                  Or paste this link in your browser:
                </p>
                <p style="margin:0;font-size:12px;color:${BRAND.amberOnDark};word-break:break-all;line-height:1.5;">
                  <a href="${escapedUrl}" style="color:${BRAND.amberOnDark};text-decoration:underline;">${escapedUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 8px 0 8px;">
                <p style="margin:0 0 8px 0;font-size:12px;color:${BRAND.textDim};line-height:1.6;">
                  If you didn't request this email, you can safely ignore it. Nobody can sign in to your account without access to your inbox.
                </p>
                <p style="margin:0;font-size:12px;color:${BRAND.textDim};">
                  ${host}
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

export function magicLinkText({ url, host }: MagicLinkParams): string {
  return `Sign in to Project Grail

Click the link below to sign in. This link works once and expires in 24 hours.

${url}

If you didn't request this email, you can safely ignore it. Nobody can sign in to your account without access to your inbox.

${host}
`;
}
