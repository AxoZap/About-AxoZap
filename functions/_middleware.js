

const PROTECTED_HOSTS = [
    "axozap.com",
"axozap-about.pages.dev"
];

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

async function getKey(secret) {
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
                                   { name: "HMAC", hash: "SHA-256" },
                                   false,
                                   ["sign", "verify"]
    );
}

async function makeToken(key) {
    const expires = String(
        Math.floor(Date.now() / 1000) + THIRTY_DAYS
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(expires)
    );

    const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

    return `${expires}.${hex}`;
}

async function validToken(token, key) {
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [expires, hex] = parts;

    if (!/^\d+$/.test(expires) ||
        !/^[0-9a-f]{64}$/.test(hex)) {
        return false;
        }

        if (Number(expires) <= Date.now() / 1000) {
            return false;
        }

        const signature = new Uint8Array(
            hex.match(/.{2}/g).map(h => parseInt(h, 16))
        );

        return crypto.subtle.verify(
            "HMAC",
            key,
            signature,
            encoder.encode(expires)
        );
}

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    const ALLOWED_EMAILS = (env.ALLOWED_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

    const PROTECTED_PATHS = [
        "/",
        "/UVA.html",
        "/HighSchool.html"
    ];

    if (
        !PROTECTED_HOSTS.includes(url.hostname) ||
        !PROTECTED_PATHS.includes(url.pathname)
    ) {
        return next();
    }

   if (!env.SITE_AUTH_SECRET || !env.ALLOWED_EMAILS) {
        return new Response("Authentication not configured", {
            status: 500
        });
    }

    const key = await getKey(env.SITE_AUTH_SECRET);

    const cookies = request.headers.get("Cookie") || "";
    const token = cookies
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("site_auth="))
    ?.slice("site_auth=".length);

    if (await validToken(token, key)) {
        return next();
    }

    if (request.method === "POST") {
        const contentType =
        request.headers.get("Content-Type") || "";

        if (contentType.includes(
            "application/x-www-form-urlencoded"
        )) {
            const formData = await request.formData();
            const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();

            if (ALLOWED_EMAILS.includes(email)) {
                const signedToken = await makeToken(key);

                return new Response(null, {
                    status: 303,
                    headers: {
                        "Location": url.pathname + url.search,
                        "Set-Cookie":
                        `site_auth=${signedToken}; ` +
                        `Path=/; Max-Age=${THIRTY_DAYS}; ` +
                        "HttpOnly; Secure; SameSite=Lax",
                        "Cache-Control": "no-store"
                    }
                });
            }
        }

        return loginPage(true);
    }

    if (request.method !== "GET" &&
        request.method !== "HEAD") {
        return new Response("Unauthorized", { status: 401 });
        }

        return loginPage(false);
}

function loginPage(isError) {
    return new Response(`<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport"
    content="width=device-width, initial-scale=1">
    <title>Axozap - Private Access</title>
    <style>
    * { box-sizing: border-box; }

    body {
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #f4f6f9;
        margin: 0;
        padding: 20px;
    }

    .box {
        background: white;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        width: 100%;
        max-width: 360px;
        text-align: center;
    }

    h2 { margin-top: 0; }

    p { color: #666; font-size: 14px; }

    input {
        width: 100%;
        padding: 13px;
        margin: 15px 0;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 16px;
    }

    button {
        background: #007bff;
        color: white;
        border: none;
        padding: 13px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        width: 100%;
    }

    button:hover { background: #0056b3; }

    .error {
        color: #c62828;
        font-size: 14px;
        margin: 10px 0;
    }
    </style>
    </head>
    <body>
    <div class="box">
    <h2>Axozap</h2>
    <p>Enter my application email to access this site</p>
    ${isError
        ? '<div class="error">Access Denied: Email not authorized</div>'
        : ''}
        <form method="POST">
        <input
        type="email"
        name="email"
        placeholder="you@axozap.com"
        required
        autocomplete="email"
        >
        <button type="submit">Access Site</button>
        </form>
        </div>
        </body>
        </html>`, {
            status: isError ? 403 : 200,
            headers: {
                "Content-Type": "text/html; charset=UTF-8",
                "Cache-Control": "no-store",
                "X-Robots-Tag": "noindex"
            }
        });
}
