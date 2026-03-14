import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  deleteMicrosoftBinding,
  getMicrosoftBinding,
  isDatabaseConfigured,
  listExamRecords,
  updateMicrosoftBindingSyncStatus,
  upsertMicrosoftBinding,
} from "./server/db.ts";
import { syncExamData } from "./server/exams/sync.ts";
import {
  buildMicrosoftAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchMicrosoftUser,
  isMicrosoftConfigured,
  refreshMicrosoftAccessToken,
} from "./server/microsoft/oauth.ts";

const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE_NAME = "portal_session";
const OAUTH_STATE_COOKIE_NAME = "microsoft_oauth_state";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || "portal-session-secret-change-in-production";
const isVercel = Boolean(process.env.VERCEL);
const isProd = process.env.NODE_ENV === "production" || isVercel;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

type SessionPayload = {
  authCookies: string;
  pupilId?: string;
  exp: number;
};

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return acc;
    acc[rawName] = decodeURIComponent(rawValue.join("=") || "");
    return acc;
  }, {});
}

function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createSessionToken(payload: SessionPayload) {
  const encoded = encodeBase64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

function readSession(req: express.Request): SessionPayload | null {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME];
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as SessionPayload;
    if (!parsed.authCookies || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function cookieAttributes(maxAgeSeconds: number) {
  const attrs = [
    `Path=/`,
    `HttpOnly`,
    `Max-Age=${maxAgeSeconds}`,
    isProd ? "SameSite=None" : "SameSite=Lax",
  ];
  if (isProd) attrs.push("Secure");
  return attrs.join("; ");
}

function appendSetCookie(res: express.Response, cookie: string) {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, cookie]);
    return;
  }
  res.setHeader("Set-Cookie", [String(current), cookie]);
}

function writeSession(res: express.Response, payload: Omit<SessionPayload, "exp"> & { exp?: number }) {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + SESSION_MAX_AGE_MS,
  };
  const token = createSessionToken(fullPayload);
  appendSetCookie(
    res,
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(Math.floor(SESSION_MAX_AGE_MS / 1000))}`,
  );
}

function clearSession(res: express.Response) {
  appendSetCookie(
    res,
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; ${isProd ? "SameSite=None; Secure" : "SameSite=Lax"}`,
  );
}

function getAuthCookies(req: express.Request): string | null {
  return readSession(req)?.authCookies ?? null;
}

function updateSession(res: express.Response, req: express.Request, patch: Partial<SessionPayload>) {
  const existing = readSession(req);
  if (!existing) return;
  writeSession(res, { ...existing, ...patch });
}

function writeOAuthState(res: express.Response, state: string) {
  const token = `${state}.${sign(state)}`;
  appendSetCookie(
    res,
    `${OAUTH_STATE_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(Math.floor(OAUTH_STATE_MAX_AGE_MS / 1000))}`,
  );
}

function readOAuthState(req: express.Request) {
  const token = parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE_NAME];
  if (!token) return null;
  const [state, signature] = token.split(".");
  if (!state || !signature || sign(state) !== signature) return null;
  return state;
}

function clearOAuthState(res: express.Response) {
  appendSetCookie(
    res,
    `${OAUTH_STATE_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; ${isProd ? "SameSite=None; Secure" : "SameSite=Lax"}`,
  );
}

function getTokenEncryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

function decryptSecret(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

type PortalStudentDetails = Record<string, string> & {
  middleName: string;
  pupilId: string;
};

async function fetchPupilIdFromPortal(cookies: string) {
  const response = await axios.get("https://ulinkcollege.engagehosted.cn/VLE/pupildetails.aspx?detail=PupilDetails", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500;
    },
  });

  if (response.status === 401 || response.status === 302) {
    throw new Error("Unauthorized");
  }

  const html = response.data as string;
  const patterns = [
    /pupilIDs?:\s*["'](\d+)["']/i,
    /Pupil[^=]*?=\s*["'](\d+)["']/i,
    /value=["'](\d{3,5})["']/i,
    /pupil.*?["'](\d+)["']/i,
    /(\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error("Could not find pupil ID in HTML");
}

async function fetchStudentDetailsFromPortal(cookies: string): Promise<PortalStudentDetails> {
  const mainResponse = await axios.get("https://ulinkcollege.engagehosted.cn/VLE/pupildetails.aspx?detail=PupilDetails", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500;
    },
  });

  if (mainResponse.status === 401 || mainResponse.status === 302) {
    throw new Error("Unauthorized");
  }

  const mainHtml = mainResponse.data as string;
  const $main = cheerio.load(mainHtml);
  const encryptedPupilId = $main('input[id$="hdnPupilID"]').val() as string;

  if (!encryptedPupilId) {
    throw new Error("Could not find encrypted pupil ID");
  }

  const detailsResponse = await axios.post("https://ulinkcollege.engagehosted.cn/Services/PupilDetailsServices.asmx/RenderSimpleSection", {
    encryptedPupilID: encryptedPupilId,
    sectionType: "PupilDetails",
  }, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Cookie": cookies,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  const detailsHtml = detailsResponse.data.d as string;
  const $ = cheerio.load(detailsHtml);

  const fieldMap: Record<string, string> = {
    "Surname": "surname",
    "姓": "surname",
    "Forename": "forename",
    "名": "forename",
    "First Name": "forename",
    "Middle Name": "middleName",
    "中间名": "middleName",
    "Preferred Name": "preferredName",
    "偏好姓名": "preferredName",
    "Year Group": "yearGroup",
    "Grade": "yearGroup",
    "年级": "yearGroup",
    "Homeroom": "homeroom",
    "Form": "homeroom",
    "Reg Group": "homeroom",
    "Registration Group": "homeroom",
    "班级教室": "homeroom",
    "Age": "age",
    "年龄": "age",
    "Date of Birth": "dateOfBirth",
    "DOB": "dateOfBirth",
    "生日": "dateOfBirth",
    "Tutor": "tutor",
    "Form Tutor": "tutor",
    "班主任": "tutor",
    "Homeroom Teacher": "tutor",
    "Gender": "gender",
    "Sex": "gender",
    "性别": "gender",
    "Email": "email",
    "Email Address": "email",
    "E-mail": "email",
    "邮箱": "email",
    "Student ID": "studentId",
    "Student Code": "studentId",
    "学生学号": "studentId",
    "Mobile": "mobile",
  };

  const result: PortalStudentDetails = {
    surname: "",
    forename: "",
    middleName: "",
    preferredName: "",
    yearGroup: "",
    homeroom: "",
    age: "",
    dateOfBirth: "",
    tutor: "",
    gender: "",
    email: "",
    studentId: "",
    pupilId: "",
    mobile: "",
  };

  $("th").each((_, el) => {
    const labelText = $(el).text().trim().replace(/:$/, "").trim();
    for (const [label, key] of Object.entries(fieldMap)) {
      if (labelText.toLowerCase() === label.toLowerCase() && !result[key]) {
        const nextTd = $(el).next("td");
        if (nextTd.length) {
          const val = nextTd.text().trim();
          if (val) result[key] = val;
        }
      }
    }
  });

  $("td").each((_, el) => {
    const labelText = $(el).text().trim().replace(/:$/, "").trim();
    for (const [label, key] of Object.entries(fieldMap)) {
      if (labelText.toLowerCase() === label.toLowerCase() && !result[key]) {
        const nextTd = $(el).next("td");
        if (nextTd.length) {
          const val = nextTd.text().trim();
          if (val) result[key] = val;
        }
      }
    }
  });

  $("span, label").each((_, el) => {
    const labelText = $(el).text().trim().replace(/:$/, "").trim();
    for (const [label, key] of Object.entries(fieldMap)) {
      if (labelText.toLowerCase() === label.toLowerCase() && !result[key]) {
        let val = $(el).next().text().trim();
        if (!val) {
          val = $(el).parent().next().text().trim();
        }
        if (!val) {
          val = $(el).parent().find("input, select").val() as string || "";
        }
        if (val) result[key] = val;
      }
    }
  });

  const idPatterns: Record<string, RegExp> = {
    surname: /surname/i,
    forename: /forename|firstname/i,
    middleName: /middle/i,
    yearGroup: /yeargroup|year.*group|grade/i,
    homeroom: /homeroom|form|reg.*group/i,
    age: /\bage\b/i,
    dateOfBirth: /dob|date.*birth|birthday/i,
    tutor: /tutor/i,
    gender: /gender|sex/i,
    email: /email|e-?mail/i,
  };

  for (const [key, pattern] of Object.entries(idPatterns)) {
    if (result[key]) continue;
    $("span, input, select, label").each((_, el) => {
      if (result[key]) return;
      const id = $(el).attr("id") || "";
      if (pattern.test(id)) {
        const val = ($(el).val() as string) || $(el).text().trim();
        if (val) result[key] = val;
      }
    });
  }

  const regexPatterns: [string, RegExp][] = [
    ["surname", /Surname[^<]*<[^>]*>([^<]+)/i],
    ["forename", /Forename[^<]*<[^>]*>([^<]+)/i],
    ["middleName", /Middle\s*Name[^<]*<[^>]*>([^<]+)/i],
    ["yearGroup", /Year\s*Group[^<]*<[^>]*>([^<]+)/i],
    ["homeroom", /(?:Homeroom|Form|Reg(?:istration)?\s*Group)[^<]*<[^>]*>([^<]+)/i],
    ["age", /\bAge\b[^<]*<[^>]*>([^<]+)/i],
    ["dateOfBirth", /Date\s*of\s*Birth[^<]*<[^>]*>([^<]+)/i],
    ["tutor", /(?:Form\s*)?Tutor[^<]*<[^>]*>([^<]+)/i],
    ["gender", /Gender[^<]*<[^>]*>([^<]+)/i],
    ["email", /E-?mail[^<]*<[^>]*>([^<]+)/i],
  ];

  for (const [key, pattern] of regexPatterns) {
    if (result[key]) continue;
    const match = detailsHtml.match(pattern);
    if (match?.[1]) {
      result[key] = match[1].trim();
    }
  }

  const pupilIdPatterns = [
    /pupilIDs?:\s*["'](\d+)["']/i,
    /Pupil[^=]*?=\s*["'](\d+)["']/i,
    /value=["'](\d{3,5})["']/i,
    /pupil.*?["'](\d+)["']/i,
    /(\d{4})/,
  ];

  for (const pattern of pupilIdPatterns) {
    if (result.pupilId) break;
    const match = mainHtml.match(pattern);
    if (match?.[1]) {
      result.pupilId = match[1];
    }
  }

  return result;
}

async function ensurePupilId(req: express.Request, res: express.Response) {
  const existing = readSession(req)?.pupilId;
  if (existing) return existing;
  const cookies = getAuthCookies(req);
  if (!cookies) throw new Error("No authentication token provided");
  const pupilId = await fetchPupilIdFromPortal(cookies);
  updateSession(res, req, { pupilId });
  return pupilId;
}

async function getMicrosoftAccessTokenForPupil(pupilId: string) {
  const binding = await getMicrosoftBinding(pupilId);
  if (!binding) {
    throw new Error("Microsoft account is not bound");
  }

  let accessToken = decryptSecret(binding.accessTokenEncrypted);
  let refreshToken = decryptSecret(binding.refreshTokenEncrypted);
  const expiresAt = new Date(binding.tokenExpiresAt).getTime();

  if (Number.isFinite(expiresAt) && expiresAt <= Date.now() + 5 * 60 * 1000) {
    const refreshed = await refreshMicrosoftAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken || refreshToken;
    await upsertMicrosoftBinding({
      pupilId,
      microsoftEmail: binding.microsoftEmail,
      microsoftUserId: binding.microsoftUserId,
      accessTokenEncrypted: encryptSecret(accessToken),
      refreshTokenEncrypted: encryptSecret(refreshToken),
      tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      scope: refreshed.scope || binding.scope,
    });
  }

  return accessToken;
}

function buildSettingsRedirect(status: string, reason?: string) {
  const params = new URLSearchParams({ ms: status });
  if (reason) params.set("reason", reason);
  return `/settings?${params.toString()}`;
}

async function createApp() {
  const app = express();
  app.set("trust proxy", true);

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Disable ETag for all API routes to prevent 304 caching of user-specific data
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("ETag", "false");
    app.set("etag", false);
    next();
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/me", (req, res) => {
    if (readSession(req)?.authCookies) {
      return res.json({ authenticated: true });
    }
    return res.status(401).json({ authenticated: false });
  });

  app.get("/api/microsoft/status", async (req, res) => {
    if (!readSession(req)?.authCookies) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const databaseConfigured = isDatabaseConfigured();
    const microsoftConfigured = isMicrosoftConfigured();
    const tokenEncryptionConfigured = Boolean(process.env.TOKEN_ENCRYPTION_KEY);

    if (!databaseConfigured || !microsoftConfigured || !tokenEncryptionConfigured) {
      return res.json({
        configured: false,
        databaseConfigured,
        microsoftConfigured,
        tokenEncryptionConfigured,
        bound: false,
      });
    }

    try {
      const pupilId = await ensurePupilId(req, res);
      const binding = await getMicrosoftBinding(pupilId);
      return res.json({
        configured: true,
        databaseConfigured,
        microsoftConfigured,
        tokenEncryptionConfigured,
        bound: Boolean(binding),
        pupilId,
        email: binding?.microsoftEmail ?? null,
        lastSyncAt: binding?.lastSyncAt ?? null,
        lastSyncStatus: binding?.lastSyncStatus ?? null,
        lastSyncMessage: binding?.lastSyncMessage ?? null,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to load Microsoft binding status" });
    }
  });

  app.get("/api/microsoft/connect", async (req, res) => {
    if (!readSession(req)?.authCookies) {
      return res.redirect(buildSettingsRedirect("portal-auth-required"));
    }

    if (!isDatabaseConfigured() || !isMicrosoftConfigured() || !process.env.TOKEN_ENCRYPTION_KEY) {
      return res.redirect(buildSettingsRedirect("config-error"));
    }

    try {
      await ensurePupilId(req, res);
      const state = crypto.randomBytes(24).toString("base64url");
      writeOAuthState(res, state);
      return res.redirect(buildMicrosoftAuthorizeUrl(state));
    } catch (error: any) {
      return res.redirect(buildSettingsRedirect("connect-error", error.message || "unable-to-start-oauth"));
    }
  });

  app.get("/api/microsoft/callback", async (req, res) => {
    const state = String(req.query.state ?? "");
    const code = String(req.query.code ?? "");
    const errorCode = String(req.query.error ?? "");

    if (errorCode) {
      clearOAuthState(res);
      return res.redirect(buildSettingsRedirect("oauth-error", errorCode));
    }

    if (!state || !code || state !== readOAuthState(req)) {
      clearOAuthState(res);
      return res.redirect(buildSettingsRedirect("state-error"));
    }

    if (!readSession(req)?.authCookies) {
      clearOAuthState(res);
      return res.redirect(buildSettingsRedirect("portal-auth-required"));
    }

    if (!isDatabaseConfigured() || !isMicrosoftConfigured() || !process.env.TOKEN_ENCRYPTION_KEY) {
      clearOAuthState(res);
      return res.redirect(buildSettingsRedirect("config-error"));
    }

    try {
      const pupilId = await ensurePupilId(req, res);
      const tokenResponse = await exchangeAuthorizationCode(code);
      if (!tokenResponse.refreshToken) {
        throw new Error("Microsoft did not return a refresh token");
      }
      const graphUser = await fetchMicrosoftUser(tokenResponse.accessToken);
      const microsoftEmail = graphUser.mail || graphUser.userPrincipalName;

      if (!microsoftEmail) {
        throw new Error("Unable to resolve Microsoft account email");
      }

      await upsertMicrosoftBinding({
        pupilId,
        microsoftEmail,
        microsoftUserId: graphUser.id,
        accessTokenEncrypted: encryptSecret(tokenResponse.accessToken),
        refreshTokenEncrypted: encryptSecret(tokenResponse.refreshToken),
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
        scope: tokenResponse.scope,
      });

      clearOAuthState(res);
      return res.redirect(buildSettingsRedirect("connected"));
    } catch (error: any) {
      console.error("Microsoft callback error:", error.message);
      clearOAuthState(res);
      return res.redirect(buildSettingsRedirect("callback-error", error.message || "microsoft-callback-failed"));
    }
  });

  app.post("/api/microsoft/unbind", async (req, res) => {
    if (!readSession(req)?.authCookies) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: "Database is not configured" });
    }

    try {
      const pupilId = await ensurePupilId(req, res);
      await deleteMicrosoftBinding(pupilId);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to unbind Microsoft account" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    try {
      const loginUrl = "https://ulinkcollege.engagehosted.cn/Login.aspx?ReturnUrl=%2f";
      
      // Step 1: Fetch the login page to get the hidden fields (ViewState, etc.)
      const initialResponse = await axios.get(loginUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        }
      });

      const cookies = initialResponse.headers["set-cookie"] || [];
      const sessionId = cookies.find(c => c.includes("ASP.NET_SessionId"))?.split(";")[0] || "";

      const $ = cheerio.load(initialResponse.data);
      const viewState = $("#__VIEWSTATE").val() as string;
      const viewStateGenerator = $("#__VIEWSTATEGENERATOR").val() as string;
      const eventValidation = $("#__EVENTVALIDATION").val() as string;

      if (!viewState || !viewStateGenerator || !eventValidation) {
        return res.status(500).json({ error: "Failed to extract ASP.NET hidden fields" });
      }

      // Step 2: Send the POST request with the extracted fields
      const formData = new URLSearchParams();
      
      // Dynamically extract all hidden inputs to ensure ASP.NET WebForms compatibility
      $("input[type='hidden']").each((_, el) => {
        const name = $(el).attr("name");
        const value = $(el).attr("value") || "";
        if (name) {
          formData.append(name, value);
        }
      });

      // Add specific login fields
      formData.append("ctl00$PageContent$loginControl$txtUN", username);
      formData.append("ctl00$PageContent$loginControl$txtPwd", password);
      formData.append("ctl00$PageContent$loginControl$btnLogin", "Login");

      const loginResponse = await axios.post(loginUrl, formData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          "Cookie": sessionId,
          "Origin": "https://ulinkcollege.engagehosted.cn",
          "Referer": loginUrl
        },
        maxRedirects: 0, // We want to catch the 302 redirect
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Resolve on 302
        }
      });

      // Check if login was successful (usually a 302 redirect to /vle/default.aspx)
      if (loginResponse.status === 302 && loginResponse.headers.location === "/vle/default.aspx") {
        // Extract the auth cookies
        const authCookies = loginResponse.headers["set-cookie"] || [];
        
        // We need to combine the initial sessionId with the new auth cookies
        // Filter out cookies that are just clearing the value (e.g., .ASPXFORMSAUTH=;)
        const validAuthCookies = authCookies
          .map(c => c.split(";")[0])
          .filter(c => !c.endsWith("="));

        const allCookies = [
          sessionId,
          ...validAuthCookies
        ].filter(Boolean).join("; ");

        // Vercel-compatible session: store upstream cookies in a signed httpOnly cookie.
        writeSession(res, { authCookies: allCookies });
        return res.json({ success: true });
      }

      // If we didn't get the expected redirect, login probably failed (e.g., wrong password)
      return res.status(401).json({ error: "Invalid username or password" });

    } catch (error: any) {
      console.error("Login error:", error.message);
      return res.status(500).json({ error: "An error occurred during login" });
    }
  });

  app.post("/api/logout", async (req, res) => {
    const cookies = getAuthCookies(req);
    
    if (cookies) {
      try {
        const logoutUrl = "https://ulinkcollege.engagehosted.cn/Login.aspx?action=logout";
        await axios.get(logoutUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Cookie": cookies,
            "Referer": "https://ulinkcollege.engagehosted.cn/vle/default.aspx"
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
        });
      } catch (e) {
        /* ignore upstream errors */
      }
    }

    clearSession(res);
    clearOAuthState(res);
    res.json({ success: true, message: "Logged out successfully" });
  });

  app.get("/api/activities", async (req, res) => {
    const cookies = getAuthCookies(req);
    
    if (!cookies) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    try {
      const activitiesUrl = "https://ulinkcollege.engagehosted.cn/Services/ActivitiesService.asmx/GetSchedulesForPupilPortal";
      
      const activitiesResponse = await axios.post(activitiesUrl, { scheduleID: 18 }, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Content-Type": "application/json; charset=UTF-8",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Origin": "https://ulinkcollege.engagehosted.cn",
          "Referer": "https://ulinkcollege.engagehosted.cn/vle/default.aspx",
          "Cookie": cookies,
          "X-Requested-With": "XMLHttpRequest"
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Resolve on 401 as well
        }
      });

      if (activitiesResponse.status === 401) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      return res.json(activitiesResponse.data);
    } catch (error: any) {
      console.error("Activities error:", error.message);
      return res.status(500).json({ error: "An error occurred while fetching activities" });
    }
  });

  app.get("/api/timetable", async (req, res) => {
    const cookies = getAuthCookies(req);
    
    if (!cookies) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    try {
      const response = await axios.get("https://ulinkcollege.engagehosted.cn/VLE/WeeklyTimetable.aspx", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Cookie": cookies
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });

      if (response.status === 401 || response.status === 302) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const $ = cheerio.load(response.data);
      const lessons: any[] = [];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

      $('tr').each((i, tr) => {
        let currentDay = '';

        // Try to find the day in this row
        $(tr).find('td, th').each((j, cell) => {
          const cellText = $(cell).text().trim();
          const foundDay = days.find(d => cellText.toLowerCase() === d.toLowerCase() || cellText.toLowerCase().includes(d.toLowerCase()));
          if (foundDay && !currentDay) {
            currentDay = foundDay;
          }

          // If we have a day, look for lessons in the cells
          if (currentDay) {
            const cellHtml = $(cell).html() || '';
            // Replace common block elements and breaks with newlines
            const cleanText = cellHtml
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/div>/gi, '\n')
              .replace(/<\/p>/gi, '\n')
              .replace(/<[^>]+>/g, ' ') // Strip remaining tags
              .split('\n')
              .map(s => s.trim())
              .filter(s => s.length > 0);

            const timeRegex = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
            const timeMatch = cleanText.find(s => timeRegex.test(s));

            if (timeMatch) {
              const timeStr = timeMatch.match(timeRegex)![0];
              const startTime = timeMatch.match(timeRegex)![1];
              const endTime = timeMatch.match(timeRegex)![2];

              const otherParts = cleanText.filter(s => s !== timeMatch);

              let period = '';
              let subject = '';
              let room = '';
              let teacher = '';

              otherParts.forEach(part => {
                const lowerPart = part.toLowerCase();
                if (lowerPart.includes('period') || lowerPart.includes('节') || lowerPart.match(/^p\d+$/)) {
                  period = part;
                } else if (lowerPart.includes('room') || lowerPart.includes('classroom') || part.match(/^[A-Z]+\d+/)) {
                  room = part;
                } else if (!subject) {
                  subject = part;
                } else if (!teacher) {
                  teacher = part;
                } else {
                  subject += ' ' + part; // fallback
                }
              });

              // Normalize day to English for easier frontend handling
              let normalizedDay = currentDay;
              if (currentDay.includes('一')) normalizedDay = 'Monday';
              if (currentDay.includes('二')) normalizedDay = 'Tuesday';
              if (currentDay.includes('三')) normalizedDay = 'Wednesday';
              if (currentDay.includes('四')) normalizedDay = 'Thursday';
              if (currentDay.includes('五')) normalizedDay = 'Friday';

              lessons.push({
                day: normalizedDay,
                startTime,
                endTime,
                time: timeStr,
                subject: subject || 'Unknown',
                room: room || '',
                teacher: teacher || '',
                period: period || '',
                raw: cleanText
              });
            }
          }
        });
      });

      // Sort lessons by start time
      lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));

      return res.json({ lessons });
    } catch (error: any) {
      console.error("Timetable error:", error.message);
      return res.status(500).json({ error: "An error occurred while fetching timetable" });
    }
  });

  app.get("/api/student-details", async (req, res) => {
    const cookies = getAuthCookies(req);

    if (!cookies) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    try {
      // Step 1: Fetch the main page to get the encrypted pupil ID
      const mainResponse = await axios.get("https://ulinkcollege.engagehosted.cn/VLE/pupildetails.aspx?detail=PupilDetails", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Cookie": cookies
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });

      if (mainResponse.status === 401 || mainResponse.status === 302) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const mainHtml = mainResponse.data as string;
      const $main = cheerio.load(mainHtml);
      
      // Extract the encrypted pupil ID
      const encryptedPupilId = $main('input[id$="hdnPupilID"]').val() as string;
      
      if (!encryptedPupilId) {
        return res.status(500).json({ error: "Could not find encrypted pupil ID" });
      }

      // Step 2: Fetch the actual pupil details via the AJAX endpoint
      const detailsResponse = await axios.post("https://ulinkcollege.engagehosted.cn/Services/PupilDetailsServices.asmx/RenderSimpleSection", {
        encryptedPupilID: encryptedPupilId,
        sectionType: "PupilDetails"
      }, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Cookie": cookies,
          "Content-Type": "application/json; charset=utf-8"
        }
      });

      const detailsHtml = detailsResponse.data.d as string;
      const $ = cheerio.load(detailsHtml);

      const fieldMap: Record<string, string> = {
        "Surname": "surname",
        "姓": "surname",
        "Forename": "forename",
        "名": "forename",
        "First Name": "forename",
        "Middle Name": "middleName",
        "中间名": "middleName",
        "Preferred Name": "preferredName",
        "偏好姓名": "preferredName",
        "Year Group": "yearGroup",
        "Grade": "yearGroup",
        "年级": "yearGroup",
        "Homeroom": "homeroom",
        "Form": "homeroom",
        "Reg Group": "homeroom",
        "Registration Group": "homeroom",
        "班级教室": "homeroom",
        "Age": "age",
        "年龄": "age",
        "Date of Birth": "dateOfBirth",
        "DOB": "dateOfBirth",
        "生日": "dateOfBirth",
        "Tutor": "tutor",
        "Form Tutor": "tutor",
        "班主任": "tutor",
        "Homeroom Teacher": "tutor",
        "Gender": "gender",
        "Sex": "gender",
        "性别": "gender",
        "Email": "email",
        "Email Address": "email",
        "E-mail": "email",
        "邮箱": "email",
        "Student ID": "studentId",
        "Student Code": "studentId",
        "学生学号": "studentId",
        "Mobile": "mobile",
      };

      const result: Record<string, string> = {
        surname: "",
        forename: "",
        middleName: "",
        preferredName: "",
        yearGroup: "",
        homeroom: "",
        age: "",
        dateOfBirth: "",
        tutor: "",
        gender: "",
        email: "",
        studentId: "",
        pupilId: "",
        mobile: "",
      };

      // Strategy 1: <th> label → next <td> sibling value
      $("th").each((_, el) => {
        const labelText = $(el).text().trim().replace(/:$/, "").trim();
        for (const [label, key] of Object.entries(fieldMap)) {
          if (labelText.toLowerCase() === label.toLowerCase() && !result[key]) {
            const nextTd = $(el).next("td");
            if (nextTd.length) {
              const val = nextTd.text().trim();
              if (val) result[key] = val;
            }
          }
        }
      });

      // Strategy 1b: <td> label → next <td> sibling value
      $("td").each((_, el) => {
        const labelText = $(el).text().trim().replace(/:$/, "").trim();
        for (const [label, key] of Object.entries(fieldMap)) {
          if (labelText.toLowerCase() === label.toLowerCase() && !result[key]) {
            const nextTd = $(el).next("td");
            if (nextTd.length) {
              const val = nextTd.text().trim();
              if (val) result[key] = val;
            }
          }
        }
      });

      // Strategy 2: <span>/<label> with class containing "label" → next sibling or parent's next sibling
      $("span, label").each((_, el) => {
        const labelText = $(el).text().trim().replace(/:$/, "").trim();
        for (const [label, key] of Object.entries(fieldMap)) {
          if (labelText.toLowerCase() === label.toLowerCase() && !result[key]) {
            let val = $(el).next().text().trim();
            if (!val) {
              val = $(el).parent().next().text().trim();
            }
            if (!val) {
              val = $(el).parent().find("input, select").val() as string || "";
            }
            if (val) result[key] = val;
          }
        }
      });

      // Strategy 3: Look for <span> or <input> elements whose id contains the field name
      const idPatterns: Record<string, RegExp> = {
        surname: /surname/i,
        forename: /forename|firstname/i,
        middleName: /middle/i,
        yearGroup: /yeargroup|year.*group|grade/i,
        homeroom: /homeroom|form|reg.*group/i,
        age: /\bage\b/i,
        dateOfBirth: /dob|date.*birth|birthday/i,
        tutor: /tutor/i,
        gender: /gender|sex/i,
        email: /email|e-?mail/i,
      };

      for (const [key, pattern] of Object.entries(idPatterns)) {
        if (result[key]) continue;
        $("span, input, select, label").each((_, el) => {
          if (result[key]) return;
          const id = $(el).attr("id") || "";
          if (pattern.test(id)) {
            const val = ($(el).val() as string) || $(el).text().trim();
            if (val) result[key] = val;
          }
        });
      }

      // Strategy 4: Regex fallback on raw HTML
      const regexPatterns: [string, RegExp][] = [
        ["surname", /Surname[^<]*<[^>]*>([^<]+)/i],
        ["forename", /Forename[^<]*<[^>]*>([^<]+)/i],
        ["middleName", /Middle\s*Name[^<]*<[^>]*>([^<]+)/i],
        ["yearGroup", /Year\s*Group[^<]*<[^>]*>([^<]+)/i],
        ["homeroom", /(?:Homeroom|Form|Reg(?:istration)?\s*Group)[^<]*<[^>]*>([^<]+)/i],
        ["age", /\bAge\b[^<]*<[^>]*>([^<]+)/i],
        ["dateOfBirth", /Date\s*of\s*Birth[^<]*<[^>]*>([^<]+)/i],
        ["tutor", /(?:Form\s*)?Tutor[^<]*<[^>]*>([^<]+)/i],
        ["gender", /Gender[^<]*<[^>]*>([^<]+)/i],
        ["email", /E-?mail[^<]*<[^>]*>([^<]+)/i],
      ];

      for (const [key, pattern] of regexPatterns) {
        if (result[key]) continue;
        const match = detailsHtml.match(pattern);
        if (match && match[1]) {
          result[key] = match[1].trim();
        }
      }

      // Extract pupilId (same logic as /api/pupil-id)
      const pupilIdPatterns = [
        /pupilIDs?:\s*["'](\d+)["']/i,
        /Pupil[^=]*?=\s*["'](\d+)["']/i,
        /value=["'](\d{3,5})["']/i,
        /pupil.*?["'](\d+)["']/i,
        /(\d{4})/,
      ];
      for (const pattern of pupilIdPatterns) {
        if (result.pupilId) break;
        const match = mainHtml.match(pattern);
        if (match && match[1]) {
          result.pupilId = match[1];
        }
      }

      if (result.pupilId) {
        updateSession(res, req, { pupilId: result.pupilId });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Student details error:", error.message);
      return res.status(500).json({ error: "An error occurred while fetching student details" });
    }
  });

  app.get("/api/pupil-id", async (req, res) => {
    const cookies = getAuthCookies(req);
    
    if (!cookies) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    try {
      const response = await axios.get("https://ulinkcollege.engagehosted.cn/VLE/pupildetails.aspx?detail=PupilDetails", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Cookie": cookies
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });

      if (response.status === 401 || response.status === 302) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const html = response.data;
      let pupilId = null;

      // Regex patterns ported from the Python script
      const patterns = [
        /pupilIDs?:\s*["'](\d+)["']/i,
        /Pupil[^=]*?=\s*["'](\d+)["']/i,
        /value=["'](\d{3,5})["']/i,
        /pupil.*?["'](\d+)["']/i,
        /(\d{4})/
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          pupilId = match[1];
          break;
        }
      }

      if (pupilId) {
        return res.json({ pupilId });
      } else {
        return res.status(404).json({ error: "Could not find pupil ID in HTML" });
      }
    } catch (error: any) {
      console.error("Pupil ID error:", error.message);
      return res.status(500).json({ error: "An error occurred while fetching pupil ID" });
    }
  });

  app.post("/api/exams/sync", async (req, res) => {
    const cookies = getAuthCookies(req);

    if (!cookies) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    if (!isDatabaseConfigured() || !isMicrosoftConfigured() || !process.env.TOKEN_ENCRYPTION_KEY) {
      return res.status(503).json({ error: "Microsoft exam sync is not configured" });
    }

    try {
      const pupilId = await ensurePupilId(req, res);
      const binding = await getMicrosoftBinding(pupilId);

      if (!binding) {
        return res.status(409).json({ error: "Microsoft account is not bound" });
      }

      const studentDetails = await fetchStudentDetailsFromPortal(cookies);
      if (studentDetails.pupilId) {
        updateSession(res, req, { pupilId: studentDetails.pupilId });
      }

      if (!studentDetails.middleName) {
        await updateMicrosoftBindingSyncStatus(pupilId, "error", "当前学生没有 middleName，无法匹配考试名单");
        return res.status(400).json({ error: "Current student does not have middleName for exam matching" });
      }

      const accessToken = await getMicrosoftAccessTokenForPupil(pupilId);
      const syncResult = await syncExamData({
        pupilId,
        middleName: studentDetails.middleName,
        accessToken,
      });

      return res.json({
        success: true,
        ...syncResult,
      });
    } catch (error: any) {
      try {
        const pupilId = await ensurePupilId(req, res);
        await updateMicrosoftBindingSyncStatus(pupilId, "error", error.message || "Microsoft exam sync failed");
      } catch {
        // ignore follow-up status update failures
      }

      console.error("Exam sync error:", error.message);
      return res.status(500).json({ error: error.message || "An error occurred while syncing exams" });
    }
  });

  app.get("/api/exams", async (req, res) => {
    if (!readSession(req)?.authCookies) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const databaseConfigured = isDatabaseConfigured();
    const microsoftConfigured = isMicrosoftConfigured();
    const tokenEncryptionConfigured = Boolean(process.env.TOKEN_ENCRYPTION_KEY);

    if (!databaseConfigured || !microsoftConfigured || !tokenEncryptionConfigured) {
      return res.json({
        configured: false,
        bound: false,
        exams: [],
        databaseConfigured,
        microsoftConfigured,
        tokenEncryptionConfigured,
      });
    }

    try {
      const pupilId = await ensurePupilId(req, res);
      const binding = await getMicrosoftBinding(pupilId);
      const from = typeof req.query.from === "string" ? req.query.from : undefined;
      const to = typeof req.query.to === "string" ? req.query.to : undefined;
      const exams = binding ? await listExamRecords(pupilId, { from, to }) : [];

      return res.json({
        configured: true,
        bound: Boolean(binding),
        email: binding?.microsoftEmail ?? null,
        lastSyncAt: binding?.lastSyncAt ?? null,
        lastSyncStatus: binding?.lastSyncStatus ?? null,
        lastSyncMessage: binding?.lastSyncMessage ?? null,
        exams,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to load exams" });
    }
  });

  app.post("/api/report-services/:action", async (req, res) => {
    const cookies = getAuthCookies(req);
    const { action } = req.params;

    if (!cookies) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    try {
      const upstreamUrl = `https://ulinkcollege.engagehosted.cn/Services/ReportCommentServices.asmx/${action}`;
      console.log(`[${action}] →`, JSON.stringify(req.body).substring(0, 300));

      const response = await axios.post(upstreamUrl, req.body, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          "Content-Type": "application/json; charset=UTF-8",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Cookie": cookies,
          "Origin": "https://ulinkcollege.engagehosted.cn",
          "Referer": "https://ulinkcollege.engagehosted.cn/VLE/pupildetails.aspx?detail=PupilDetails",
          "X-Requested-With": "XMLHttpRequest"
        },
        validateStatus: () => true,
      });

      console.log(`[${action}] ← status=${response.status}`, JSON.stringify(response.data).substring(0, 500));

      if (response.status === 302) {
        console.log(`[${action}] redirect →`, response.headers.location);
        return res.status(401).json({ error: "Unauthorized (session expired)" });
      }
      if (response.status === 401) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Forward upstream status + body (include upstream body for debugging 500s)
      return res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error(`[${action}] exception:`, error.message);
      return res.status(500).json({ error: `An error occurred while fetching ${action}`, details: error.message });
    }
  });

  if (!isVercel && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!isVercel) {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  return app;
}

const app = await createApp();

export default app;

if (!isVercel) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
