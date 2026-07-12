const APEX_HOST = "suburbmates.com.au";
const WWW_HOST = "www.suburbmates.com.au";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SuburbMates</title>
    <style>
      :root {
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, #232323 0%, #121212 42%, #090909 100%);
        color: #ffffff;
        font-family: Georgia, "Times New Roman", serif;
      }
      main {
        width: min(720px, calc(100vw - 32px));
        padding: 48px 32px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(12px);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }
      h1 {
        margin: 0 0 16px;
        font-size: clamp(2.5rem, 6vw, 4.5rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        font-size: 1.125rem;
        line-height: 1.65;
        color: rgba(255, 255, 255, 0.82);
      }
      .eyebrow {
        display: inline-block;
        margin-bottom: 20px;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 999px;
        font: 600 0.72rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.72);
      }
    </style>
  </head>
  <body>
    <main>
      <span class="eyebrow">SuburbMates</span>
      <h1>Local services, rebuilt on Cloudflare.</h1>
      <p>
        The production domain migration is in progress. The Cloudflare delivery path is now the
        system of record for SuburbMates, and the full directory experience will be deployed here
        next.
      </p>
    </main>
  </body>
</html>`;

function redirectToApex(request: Request): Response {
  const url = new URL(request.url);
  url.protocol = "https:";
  url.host = APEX_HOST;
  return Response.redirect(url.toString(), 308);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === WWW_HOST) {
      return redirectToApex(request);
    }

    if (url.pathname === "/healthz") {
      return new Response("ok", {
        headers: {
          "cache-control": "no-store",
          "content-type": "text/plain; charset=utf-8"
        }
      });
    }

    return new Response(html, {
      headers: {
        "cache-control": "public, max-age=300",
        "content-type": "text/html; charset=utf-8",
        "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
        "x-content-type-options": "nosniff"
      }
    });
  }
};
