const upstream = "https://axozap-internships-backend.peteystillwell.workers.dev/api/internships";

type Context = {
  request: Request;
};

export async function onRequest({ request }: Context): Promise<Response> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const suffix = url.pathname.slice("/api/internships".length);
  if (suffix && !/^\/[A-Za-z0-9_-]+$/.test(suffix)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const headers = new Headers({ "Cf-Access-Jwt-Assertion": token });
  if (request.method === "POST" || request.method === "PUT") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(upstream + suffix, {
    method: request.method,
    headers,
    body: request.method === "POST" || request.method === "PUT" ? await request.text() : undefined,
  });
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}
