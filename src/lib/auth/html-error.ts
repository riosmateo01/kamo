/** Friendly HTML error pages for OAuth stubs (no secrets echoed). */

export function oauthErrorHtml(opts: {
  title: string;
  message: string;
  hint?: string;
}): Response {
  const hint = opts.hint
    ? `<p style="color:#52525b;font-size:14px;margin-top:12px">${escapeHtml(opts.hint)}</p>`
    : "";
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(opts.title)}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#18181b}
    a{color:#0369a1}
    .card{border:1px solid #e4e4e7;border-radius:8px;padding:1.25rem;background:#fafafa}
  </style>
</head>
<body>
  <div class="card">
    <h1 style="font-size:1.25rem;margin:0 0 .5rem">${escapeHtml(opts.title)}</h1>
    <p style="margin:0;line-height:1.5">${escapeHtml(opts.message)}</p>
    ${hint}
    <p style="margin-top:1.25rem;font-size:14px">
      <a href="/settings/connections">← Back to Connections</a>
      · <a href="/brief">Brief</a>
    </p>
  </div>
</body>
</html>`;
  return new Response(body, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export function oauthSuccessHtml(opts: {
  provider: string;
  detail: string;
}): Response {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(opts.provider)} connected</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#18181b}
    a{color:#0369a1}
    .card{border:1px solid #e4e4e7;border-radius:8px;padding:1.25rem;background:#fafafa}
  </style>
</head>
<body>
  <div class="card">
    <h1 style="font-size:1.25rem;margin:0 0 .5rem">${escapeHtml(opts.provider)} connected</h1>
    <p style="margin:0;line-height:1.5">${escapeHtml(opts.detail)}</p>
    <p style="margin-top:1.25rem;font-size:14px">
      <a href="/settings/connections">← Back to Connections</a>
      · <a href="/brief">Brief</a>
    </p>
  </div>
</body>
</html>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
