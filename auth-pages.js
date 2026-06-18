const page = document.body.dataset.authPage;
const form = document.querySelector("[data-auth-form]");
const messageBox = document.querySelector("[data-auth-message]");
const submitButton = document.querySelector("[data-auth-submit]");

function showMessage(message, type = "error") {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.dataset.type = type;
  messageBox.hidden = false;
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.hidden = true;
  messageBox.textContent = "";
}

function setLoading(loading, label = "") {
  if (!submitButton) return;
  submitButton.disabled = loading;
  if (loading) {
    submitButton.dataset.label = submitButton.textContent;
    submitButton.textContent = label || "处理中...";
  } else if (submitButton.dataset.label) {
    submitButton.textContent = submitButton.dataset.label;
    delete submitButton.dataset.label;
  }
}

function waitForAuth() {
  if (window.DaisyAuth) return Promise.resolve(window.DaisyAuth);
  return new Promise((resolve) => {
    window.addEventListener("daisy-auth-ready", () => resolve(window.DaisyAuth), { once: true });
  });
}

function read(name) {
  return String(document.querySelector(`[name="${name}"]`)?.value || "").trim();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordError(password) {
  if (!password) return "请输入密码";
  if (password.length < 8) return "密码至少需要 8 位";
  return "";
}

function redirectParam(defaultPath = "/dashboard") {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("redirect") || defaultPath;
  return target.startsWith("/") ? target : defaultPath;
}

async function readApiUser(auth) {
  try {
    const response = await auth.apiFetch("/api/me", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function redirectIfLoggedIn(auth) {
  if (!["login", "register"].includes(page)) return;
  const session = await auth.getSession();
  if (session) window.location.replace(redirectParam("/dashboard"));
}

async function requireSession(auth) {
  const session = await auth.getSession();
  if (!session) {
    window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }
  return session;
}

function initTabs() {
  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    link.addEventListener("click", () => hideMessage());
  });
}

async function initLogin(auth) {
  await redirectIfLoggedIn(auth);
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();
    const email = read("email").toLowerCase();
    const password = read("password");
    if (!validEmail(email)) return showMessage("请输入正确的邮箱地址");
    const passwordProblem = passwordError(password);
    if (passwordProblem) return showMessage(passwordProblem);
    setLoading(true, "登录中...");
    try {
      await auth.signIn(email, password);
      showMessage("登录成功，正在进入用户中心...", "success");
      window.location.assign(redirectParam("/dashboard"));
    } catch (error) {
      showMessage(auth.authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });
}

async function initRegister(auth) {
  await redirectIfLoggedIn(auth);
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();
    const email = read("email").toLowerCase();
    const password = read("password");
    const confirmPassword = read("confirm_password");
    if (!validEmail(email)) return showMessage("请输入正确的邮箱地址");
    const passwordProblem = passwordError(password);
    if (passwordProblem) return showMessage(passwordProblem);
    if (password !== confirmPassword) return showMessage("两次输入的密码不一致");
    setLoading(true, "注册中...");
    try {
      const result = await auth.signUp(email, password, `${window.location.origin}/dashboard`);
      if (result?.needsEmailConfirmation === false) {
        showMessage("注册成功，正在进入用户中心...", "success");
        window.location.assign("/dashboard");
      } else {
        showMessage("注册成功，请打开邮箱完成验证后再登录。", "success");
        form.reset();
      }
    } catch (error) {
      showMessage(auth.authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });
}

async function initForgot(auth) {
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();
    const email = read("email").toLowerCase();
    if (!validEmail(email)) return showMessage("请输入正确的邮箱地址");
    setLoading(true, "发送中...");
    try {
      await auth.resetPassword(email, `${window.location.origin}/reset-password`);
      showMessage("重置邮件已发送，请打开邮箱里的链接继续设置新密码。", "success");
      form.reset();
    } catch (error) {
      showMessage(auth.authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });
}

async function initReset(auth) {
  await auth.getSession();
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();
    const password = read("password");
    const confirmPassword = read("confirm_password");
    const passwordProblem = passwordError(password);
    if (passwordProblem) return showMessage(passwordProblem);
    if (password !== confirmPassword) return showMessage("两次输入的新密码不一致");
    setLoading(true, "保存中...");
    try {
      await auth.updatePassword(password);
      showMessage("密码已更新，请使用新密码登录。", "success");
      setTimeout(() => window.location.assign("/dashboard"), 900);
    } catch (error) {
      showMessage(auth.authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  });
}

async function initDashboard(auth) {
  const session = await requireSession(auth);
  if (!session) return;
  const apiUser = await readApiUser(auth);
  const user = apiUser?.authenticated ? apiUser : session.user;
  document.querySelector("[data-dashboard-email]").textContent = user.email || "-";
  document.querySelector("[data-dashboard-id]").textContent = user.user_id || user.id || "-";
  const isAdmin = Boolean(apiUser?.is_admin);
  document.querySelector("[data-dashboard-role]").textContent = isAdmin ? "管理员" : "普通用户";
  document.querySelector("[data-admin-link]").hidden = !isAdmin;
  document.querySelector("[data-admin-nav]").hidden = !isAdmin;

  const logout = document.querySelector("[data-logout]");
  logout?.addEventListener("click", async () => {
    logout.disabled = true;
    logout.textContent = "退出中...";
    try {
      await auth.signOut();
      try {
        await auth.apiFetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      } catch {
        // Static deployments do not have the Python API; Supabase sign-out is enough there.
      }
      window.location.assign("/login");
    } catch (error) {
      logout.disabled = false;
      logout.textContent = "退出登录";
      showMessage(auth.authErrorMessage(error));
    }
  });
}

async function main() {
  initTabs();
  const auth = await waitForAuth();
  if (!auth.configured) {
    showMessage("认证服务尚未配置，请先填写 Supabase 公共配置或启动本地 API。");
  }
  if (page === "login") await initLogin(auth);
  if (page === "register") await initRegister(auth);
  if (page === "forgot-password") await initForgot(auth);
  if (page === "reset-password") await initReset(auth);
  if (page === "dashboard") await initDashboard(auth);
}

main().catch((error) => showMessage(String(error?.message || error)));
