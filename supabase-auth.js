const nativeFetch = window.fetch.bind(window);

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
    const response = await nativeFetch(url, { cache: "no-store" });
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

async function loadConfig() {
  const staticConfig = await readJsonConfig("/config.json");
  const staticNormalized = normalizeConfig(staticConfig);
  const publicConfigUrl = staticNormalized.apiBaseUrl
    ? `${staticNormalized.apiBaseUrl}/api/public-config`
    : "/api/public-config";
  const apiConfig = await readJsonConfig(publicConfigUrl);
  return {
    ...normalizeConfig({ ...staticConfig, ...apiConfig }),
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

function apiRequestInfo(input) {
  const raw = apiUrl(input);
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

function authErrorMessage(error) {
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();
  if (!message) return "操作失败，请稍后再试";
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
  if (!config.localAuthAvailable) return null;
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
  return nativeFetch(request.url, { ...init, credentials, headers });
}

window.fetch = async (input, init = {}) => {
  if (!apiRequestInfo(input).isApi) {
    return nativeFetch(input, init);
  }
  return apiFetch(input, init);
};

window.DaisyAuth = {
  configured: Boolean(supabase || config.localAuthAvailable),
  provider: supabase ? "supabase" : config.localAuthAvailable ? "local" : "none",
  supabase,
  config,
  authErrorMessage,
  getSession,
  getUser,
  apiFetch,
  async signUp(email, password, redirectTo) {
    if (!supabase) {
      if (!config.localAuthAvailable) throw new Error("认证服务未配置，请先启用 Supabase 或本地 API");
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(authErrorMessage(error));
    return { ...data, needsEmailConfirmation: true };
  },
  async signIn(email, password) {
    let supabaseError = null;
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return data;
      supabaseError = error;
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
    if (config.localAuthAvailable) {
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
