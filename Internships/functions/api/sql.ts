export async function onRequest({ request }: { request: Request }): Promise<Response> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const headers = new Headers({ "Cf-Access-Jwt-Assertion": token });
  for (const name of ["Content-Type", "Origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await fetch("https://axozap-internships-backend.peteystillwell.workers.dev/api/sql", {
    method: "POST", headers, body: request.body, redirect: "manual",
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" },
  });
}
