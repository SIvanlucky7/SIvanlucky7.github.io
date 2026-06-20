const nativeFetch = window.fetch.bind(window);
const DAISY_KNOWN_API_BASES = [
  "",
  "https://daisy-aigc.vercel.app",
  "https://daisy-aigc-api-proxy.western-pantydraco.workers.dev",
  "https://daisy-aigc-api-proxy.billowy-waste.workers.dev",
];
const DAISY_NETWORK_TIMEOUT_MS = 15000;
const DAISY_API_OVERRIDE_KEY = "daisy_api_base_url";

function normalizeConfig(payload = {}) {
  const apiBaseUrl =
    payload.api_base_url ||
    payload.apiBaseUrl ||
    payload.API_BASE_URL ||
    payload.VITE_API_BASE_URL ||
    payload.NEXT_PUBLIC_API_BASE_URL ||
    "";
  return {
    supabaseUrl:
      payload.supabase_url ||
      payload.supabaseUrl ||
      payload.VITE_SUPABASE_URL ||
      payload.NEXT_PUBLIC_SUPABASE_URL ||
      "",
    supabaseAnonKey:
      payload.supabase_anon_key ||
      payload.supabaseAnonKey ||
      payload.VITE_SUPABASE_ANON_KEY ||
      payload.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    apiBaseUrl: String(apiBaseUrl || "").trim().replace(/\/+$/, ""),
  };
}

async function readJsonConfig(url) {
  try {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, DAISY_NETWORK_TIMEOUT_MS);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

function uniqueApiBases(items) {
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim().replace(/\/+$/, ""))
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function fetchWithTimeout(url, init = {}, timeoutMs = DAISY_NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return nativeFetch(url, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timer);
  });
}

function publicConfigUrl(apiBaseUrl) {
  return apiBaseUrl ? `${apiBaseUrl}/api/public-config` : "/api/public-config";
}

function isNetworkFailure(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.name === "AbortError" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network") ||
    message.includes("fetch")
  );
}

async function loadConfig() {
  const staticConfig = await readJsonConfig("/config.json");
  const staticNormalized = normalizeConfig(staticConfig);
  const urlParams = new URLSearchParams(window.location.search);
  const queryApiBase = urlParams.get("api") || "";
  const resetApiBase = ["1", "true", "yes"].includes(String(urlParams.get("resetApi") || "").toLowerCase());
  if (resetApiBase) {
    try {
      window.localStorage.removeItem(DAISY_API_OVERRIDE_KEY);
    } catch {}
  }
  if (queryApiBase) {
    try {
      window.localStorage.setItem(DAISY_API_OVERRIDE_KEY, queryApiBase);
    } catch {}
  }
  let storedApiBase = "";
  if (!resetApiBase) {
    try {
      storedApiBase = window.localStorage.getItem(DAISY_API_OVERRIDE_KEY) || "";
    } catch {}
  }
  const candidates = uniqueApiBases([queryApiBase, storedApiBase, staticNormalized.apiBaseUrl, ...DAISY_KNOWN_API_BASES]);
  const attempts = [];
  let apiConfig = {};
  let selectedApiBaseUrl = staticNormalized.apiBaseUrl;

  for (const candidate of candidates) {
    const started = Date.now();
    try {
      const response = await fetchWithTimeout(publicConfigUrl(candidate), { cache: "no-store" }, DAISY_NETWORK_TIMEOUT_MS);
      const text = await response.text();
      let parsed = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = {};
      }
      attempts.push({ apiBaseUrl: candidate || "(same-origin)", ok: response.ok, status: response.status, ms: Date.now() - started });
      if (response.ok && parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        apiConfig = parsed;
        selectedApiBaseUrl = candidate;
        break;
      }
    } catch (error) {
      attempts.push({
        apiBaseUrl: candidate || "(same-origin)",
        ok: false,
        error: error?.name === "AbortError" ? "timeout" : String(error?.message || error),
        ms: Date.now() - started,
      });
    }
  }

  window.DaisyNetwork = {
    attempts,
    selectedApiBaseUrl: selectedApiBaseUrl || "(same-origin)",
    candidates,
    apiOverrideKey: DAISY_API_OVERRIDE_KEY,
    setApiBaseUrl(value) {
      const normalized = String(value || "").trim().replace(/\/+$/, "");
      if (normalized) {
        window.localStorage.setItem(DAISY_API_OVERRIDE_KEY, normalized);
      } else {
        window.localStorage.removeItem(DAISY_API_OVERRIDE_KEY);
      }
      window.location.reload();
    },
    clearApiBaseUrl() {
      window.localStorage.removeItem(DAISY_API_OVERRIDE_KEY);
      window.location.reload();
    },
  };

  return {
    ...normalizeConfig({ ...staticConfig, ...apiConfig, API_BASE_URL: selectedApiBaseUrl }),
    localAuthAvailable: Object.keys(apiConfig).length > 0,
  };
}

function apiUrl(input) {
  const raw = typeof input === "string" ? input : input?.url || "";
  if (!config.apiBaseUrl) return raw || input;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      return `${config.apiBaseUrl}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Fall through to the original input.
  }
  return raw || input;
}

function apiUrlWithBase(input, apiBaseUrl = config.apiBaseUrl) {
  const raw = typeof input === "string" ? input : input?.url || "";
  const base = String(apiBaseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return raw || input;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      return `${base}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {}
  return raw || input;
}

function apiRequestInfo(input, apiBaseUrl = config.apiBaseUrl) {
  const raw = apiUrlWithBase(input, apiBaseUrl);
  try {
    const url = new URL(raw, window.location.origin);
    return {
      isApi: url.pathname.startsWith("/api/"),
      sameOrigin: url.origin === window.location.origin,
      url: raw,
    };
  } catch {
    return { isApi: false, sameOrigin: false, url: raw };
  }
}

async function probeApiBase(apiBaseUrl) {
  const response = await fetchWithTimeout(publicConfigUrl(apiBaseUrl), { cache: "no-store" }, DAISY_NETWORK_TIMEOUT_MS);
  if (!response.ok) return false;
  const payload = await response.json().catch(() => ({}));
  return Boolean(payload && typeof payload === "object" && Object.keys(payload).length);
}

async function switchToHealthyApiBase(excludeBase = config.apiBaseUrl) {
  const candidates = window.DaisyNetwork?.candidates || DAISY_KNOWN_API_BASES;
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim().replace(/\/+$/, "");
    if (normalized === String(excludeBase || "").trim().replace(/\/+$/, "")) continue;
    try {
      if (await probeApiBase(normalized)) {
        try {
          if (normalized) {
            window.localStorage.setItem(DAISY_API_OVERRIDE_KEY, normalized);
          } else {
            window.localStorage.removeItem(DAISY_API_OVERRIDE_KEY);
          }
        } catch {}
        if (window.DaisyNetwork) {
          window.DaisyNetwork.selectedApiBaseUrl = normalized || "(same-origin)";
          window.DaisyNetwork.pendingSwitch = normalized || "(same-origin)";
        }
        return normalized;
      }
    } catch {}
  }
  return null;
}

function authErrorMessage(error) {
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();
  if (!message) return "操作失败，请稍后再试";
  if (lower.includes("supabase no-email signup is not configured")) return "免邮箱验证注册还未配置：请在 Vercel 后端环境变量添加 SUPABASE_SERVICE_ROLE_KEY";
  if (lower.includes("supabase no-email login bootstrap is not configured")) return "免邮箱验证登录补齐还未配置：请在 Vercel 后端环境变量添加 SUPABASE_SERVICE_ROLE_KEY";
  if (lower.includes("supabase no-email signup failed")) return "Supabase 免验证注册失败，请检查 service_role 密钥和 Supabase 项目设置";
  if (lower.includes("supabase no-email login bootstrap failed")) return "Supabase 账号补齐失败，请检查 service_role 密钥和 Supabase 项目设置";
  if (lower.includes("invalid login credentials")) return "邮箱或密码错误";
  if (lower.includes("email not confirmed")) return "请先打开邮箱完成验证";
  if (lower.includes("user already registered") || lower.includes("already registered")) return "该邮箱已注册，请直接登录";
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) return "邮箱格式不正确";
  if (lower.includes("password") && lower.includes("six")) return "密码至少需要 6 位";
  if (lower.includes("password")) return "密码不符合要求，请换一个更安全的密码";
  if (lower.includes("rate limit")) return "操作太频繁，请稍后再试";
  if (lower.includes("network")) return "网络连接失败，请稍后重试";
  return message;
}

const config = await loadConfig();
const apiBaseIsCrossOrigin = (() => {
  if (!config.apiBaseUrl) return false;
  try {
    return new URL(config.apiBaseUrl, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
})();

let supabase = null;
const createSupabaseClient = window.supabase?.createClient;
if (config.supabaseUrl && config.supabaseAnonKey && createSupabaseClient) {
  supabase = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

function localSessionFromUser(user) {
  if (!user?.authenticated) return null;
  return {
    access_token: "",
    provider: "local",
    user: {
      id: user.user_id || user.id || "local-user",
      email: user.email || "",
      user_metadata: {
        display_name: user.display_name || "",
      },
    },
  };
}

async function getSession() {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(authErrorMessage(error));
    if (data.session) return data.session;
  }
  if (!config.localAuthAvailable || apiBaseIsCrossOrigin) return null;
  const response = await nativeFetch(apiUrl("/api/me"), {
    cache: "no-store",
    credentials: config.apiBaseUrl ? "include" : "same-origin",
  });
  if (!response.ok) return null;
  const user = await response.json();
  return localSessionFromUser(user);
}

async function getUser() {
  if (!supabase) {
    const session = await getSession();
    return session?.user || null;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const session = await getSession();
  const request = apiRequestInfo(input);
  if (session?.access_token && request.isApi) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  const credentials = init.credentials || (config.apiBaseUrl && !request.sameOrigin ? "include" : "same-origin");
  const method = String(init.method || "GET").toUpperCase();
  try {
    return await nativeFetch(request.url, { ...init, credentials, headers });
  } catch (error) {
    if (!request.isApi || !isNetworkFailure(error)) throw error;
    const fallbackBase = await switchToHealthyApiBase(config.apiBaseUrl);
    if (!fallbackBase && fallbackBase !== "") throw error;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      const fallbackRequest = apiRequestInfo(input, fallbackBase);
      const fallbackCredentials = fallbackBase ? "include" : "same-origin";
      return nativeFetch(fallbackRequest.url, { ...init, credentials: fallbackCredentials, headers });
    }
    throw new Error("网络入口已自动切换，请重新点击一次提交。系统没有重复提交当前订单。");
  }
}

window.fetch = async (input, init = {}) => {
  if (!apiRequestInfo(input).isApi) {
    return nativeFetch(input, init);
  }
  return apiFetch(input, init);
};

window.DaisyAuth = {
  configured: Boolean(supabase || config.localAuthAvailable),
  provider: apiBaseIsCrossOrigin && supabase ? "supabase" : config.localAuthAvailable ? "local" : supabase ? "supabase" : "none",
  supabase,
  config,
  authErrorMessage,
  getSession,
  getUser,
  apiFetch,
  async signUp(email, password, redirectTo) {
    if (supabase && apiBaseIsCrossOrigin) {
      if (config.localAuthAvailable) {
        const response = await nativeFetch(apiUrl("/api/register"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, accept_terms: true, require_supabase_admin: true }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(authErrorMessage(payload.error || "注册失败"));
        }
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(authErrorMessage(error));
      return { ...data, needsEmailConfirmation: false };
    }
    if (config.localAuthAvailable) {
      const response = await nativeFetch(apiUrl("/api/register"), {
        method: "POST",
        credentials: config.apiBaseUrl ? "include" : "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, accept_terms: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(authErrorMessage(payload.error || "注册失败"));
      return {
        user: { id: payload.user_id, email: payload.email },
        session: localSessionFromUser(payload),
        needsEmailConfirmation: false,
      };
    }
    if (!supabase) throw new Error("Authentication service is not configured");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(authErrorMessage(error));
    return { ...data, needsEmailConfirmation: !data.session };
  },
  async signIn(email, password) {
    let supabaseError = null;
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return data;
      supabaseError = error;
      if (apiBaseIsCrossOrigin) {
        if (config.localAuthAvailable) {
          const response = await nativeFetch(apiUrl("/api/login"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, require_supabase_admin: true }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(authErrorMessage(payload.error || error));
          }
          const retry = await supabase.auth.signInWithPassword({ email, password });
          if (!retry.error) return retry.data;
          throw new Error(authErrorMessage(retry.error));
        }
        throw new Error(authErrorMessage(error));
      }
    }
    if (!config.localAuthAvailable) throw new Error(authErrorMessage(supabaseError || "登录失败"));
    const response = await nativeFetch(apiUrl("/api/login"), {
      method: "POST",
      credentials: config.apiBaseUrl ? "include" : "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(authErrorMessage(payload.error || supabaseError || "登录失败"));
    return {
      user: { id: payload.user_id, email: payload.email },
      session: localSessionFromUser(payload),
    };
  },
  async signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(authErrorMessage(error));
    }
    if (config.localAuthAvailable && !apiBaseIsCrossOrigin) {
      await nativeFetch(apiUrl("/api/logout"), {
        method: "POST",
        credentials: config.apiBaseUrl ? "include" : "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    }
  },
  async resetPassword(email, redirectTo) {
    if (!supabase) throw new Error("本地登录模式不支持邮件重置密码，请登录后在用户中心修改密码");
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(authErrorMessage(error));
    return data;
  },
  async updatePassword(password) {
    if (!supabase) throw new Error("本地登录模式请在用户中心使用原密码修改密码");
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(authErrorMessage(error));
    return data;
  },
};

window.dispatchEvent(new CustomEvent("daisy-auth-ready", { detail: window.DaisyAuth }));
