import axios from "axios";

const DEFAULT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Files.Read.All",
  "Sites.Read.All",
];

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface MicrosoftTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

export interface MicrosoftGraphUser {
  id: string;
  userPrincipalName?: string;
  mail?: string;
  displayName?: string;
}

export function isMicrosoftConfigured() {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID
      && process.env.MICROSOFT_CLIENT_SECRET
      && process.env.MICROSOFT_TENANT_ID
      && (process.env.MICROSOFT_REDIRECT_URI || process.env.APP_URL),
  );
}

export function getMicrosoftConfig(): MicrosoftOAuthConfig {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI
    || (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/api/microsoft/callback` : "");
  const scopes = (process.env.MICROSOFT_SCOPES ?? DEFAULT_SCOPES.join(" "))
    .split(/\s+/)
    .map(scope => scope.trim())
    .filter(Boolean);

  if (!clientId || !clientSecret || !tenantId || !redirectUri) {
    throw new Error("Microsoft OAuth configuration is incomplete");
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    scopes,
  };
}

function buildTokenEndpoint(tenantId: string) {
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
}

export function buildMicrosoftAuthorizeUrl(state: string) {
  const config = getMicrosoftConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: config.scopes.join(" "),
    state,
  });
  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

function mapTokenResponse(payload: any): MicrosoftTokenResponse {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: Number(payload.expires_in ?? 0),
    scope: payload.scope ?? "",
    tokenType: payload.token_type ?? "Bearer",
  };
}

export async function exchangeAuthorizationCode(code: string) {
  const config = getMicrosoftConfig();
  const response = await axios.post(
    buildTokenEndpoint(config.tenantId),
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      scope: config.scopes.join(" "),
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  return mapTokenResponse(response.data);
}

export async function refreshMicrosoftAccessToken(refreshToken: string) {
  const config = getMicrosoftConfig();
  const response = await axios.post(
    buildTokenEndpoint(config.tenantId),
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      redirect_uri: config.redirectUri,
      grant_type: "refresh_token",
      scope: config.scopes.join(" "),
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  return mapTokenResponse(response.data);
}

export async function fetchMicrosoftUser(accessToken: string): Promise<MicrosoftGraphUser> {
  const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  return response.data;
}
