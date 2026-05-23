const BASE_URL = process.env.RHIZOHORO_BASE_URL ?? "http://127.0.0.1:3000";
const PASSWORD = "RhizoSecurePass123!";
const EMAIL = `rhizohoro-test-${Date.now()}@example.com`;

function parseSessionCookie(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const allSetCookies =
    typeof getSetCookie === "function"
      ? getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  const sessionCookie = allSetCookies.find((cookie) =>
    cookie.startsWith("rhizohoro_session="),
  );

  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.split(";")[0];
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

function assertStatus(response, expectedStatuses, context) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${context} failed: expected status ${expectedStatuses.join(" or ")}, got ${response.status}`,
    );
  }
}

async function main() {
  console.log(`Running auth flow test against ${BASE_URL}`);

  const unauthProbe = await requestJson("/api/auth/me", { method: "GET" });
  assertStatus(unauthProbe.response, [401], "Unauthenticated probe");
  console.log("✓ Unauthenticated /api/auth/me returns 401");

  const register = await requestJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      displayName: "Rhizohoro Test User",
      studyGoalMinutes: 25,
    }),
  });
  assertStatus(register.response, [201], "Register request");
  if (!register.body?.ok) {
    throw new Error(`Register request returned non-ok body: ${JSON.stringify(register.body)}`);
  }
  const registerCookie = parseSessionCookie(register.response);
  if (!registerCookie) {
    throw new Error("Register response did not set rhizohoro_session cookie");
  }
  const workspaceId = register.body?.data?.defaultWorkspaceId;
  if (!workspaceId) {
    throw new Error("Register response missing defaultWorkspaceId");
  }
  console.log("✓ Register succeeded and session cookie received");

  const meAfterRegister = await requestJson("/api/auth/me", {
    method: "GET",
    headers: { cookie: registerCookie },
  });
  assertStatus(meAfterRegister.response, [200], "Session check after register");
  console.log("✓ /api/auth/me works with register session");

  const protectedCreateMaterial = await requestJson("/api/materials", {
    method: "POST",
    headers: { cookie: registerCookie },
    body: JSON.stringify({
      workspaceId,
      title: "Auth flow material",
      sourceType: "text",
      rawText:
        "Photosynthesis converts light energy into chemical energy in plants for growth.",
      tags: ["biology", "revision"],
      preExamFocus: true,
    }),
  });
  assertStatus(protectedCreateMaterial.response, [201], "Protected material create");
  console.log("✓ Protected /api/materials create works with session");

  const logout = await requestJson("/api/auth/logout", {
    method: "POST",
    headers: { cookie: registerCookie },
  });
  assertStatus(logout.response, [200], "Logout request");
  console.log("✓ Logout succeeded");

  const meAfterLogout = await requestJson("/api/auth/me", {
    method: "GET",
    headers: { cookie: registerCookie },
  });
  assertStatus(meAfterLogout.response, [401], "Session check after logout");
  console.log("✓ Session is invalidated after logout");

  const login = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });
  assertStatus(login.response, [200], "Login request");
  if (!login.body?.ok) {
    throw new Error(`Login request returned non-ok body: ${JSON.stringify(login.body)}`);
  }
  const loginCookie = parseSessionCookie(login.response);
  if (!loginCookie) {
    throw new Error("Login response did not set rhizohoro_session cookie");
  }
  console.log("✓ Login succeeded and session cookie received");

  const meAfterLogin = await requestJson("/api/auth/me", {
    method: "GET",
    headers: { cookie: loginCookie },
  });
  assertStatus(meAfterLogin.response, [200], "Session check after login");
  console.log("✓ /api/auth/me works after login");

  console.log("Auth flow verification PASSED");
}

main().catch((error) => {
  console.error("Auth flow verification FAILED");
  console.error(error?.message ?? error);
  process.exit(1);
});
