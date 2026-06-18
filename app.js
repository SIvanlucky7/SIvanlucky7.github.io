const state = {
  service: "aigc",
  rate: 1,
  platform: "cnki",
  input: "text",
  balance: 0,
  authenticated: false,
  email: "",
  authMode: "login",
  paymentAmount: 50,
  pendingPayment: null,
  mockPaymentsEnabled: false,
  supabaseAuthEnabled: false,
  selectedOrder: null,
  generatedApiKey: "",
  pendingJob: null,
  reportText: "",
  sourceFileName: "",
  reportFileName: "",
  originalFileName: "",
  lastDownloadUrl: "",
  lastOutputFilename: "",
  paymentPollTimer: null,
};

const UNIT_CHARS = 1000;
const LANGUAGE_RATES = {
  zh: { name: "中文", multiplier: 1 },
  en: { name: "英文", multiplier: 2 },
};

const serviceDescriptions = {
  aigc: "支持中英文文本，调用 BypassAIGC 进行表达自然化和句式调整。",
  repeat: "适合重复率偏高的段落。系统会重组句式、替换表达，并尽量保留术语、引用和原意边界。",
  combo: "先调用 BypassAIGC 降AI率，再进行重复表达优化。适合检测报告同时提示两类风险的文稿。",
  custom: "适合检测结果复杂、格式要求严格或交付标准明确的文稿。提交需求后由客服确认报价和时间。",
};

const sourceText = document.querySelector("#sourceText");
const resultText = document.querySelector("#resultText");
const count = document.querySelector("#count");
const cost = document.querySelector("#cost");
const submitBtn = document.querySelector("#submitBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const copyBtn = document.querySelector("#copyBtn");
const downloadBtn = document.querySelector("#downloadBtn");
const clearResultBtn = document.querySelector("#clearResultBtn");
const dropZone = document.querySelector("#dropZone");
const fileInput = document.querySelector("#fileInput");
const reportUploadPanel = document.querySelector("#reportUploadPanel");
const reportFileInput = document.querySelector("#reportFileInput");
const originalFileInput = document.querySelector("#originalFileInput");
const reportFileName = document.querySelector("#reportFileName");
const originalFileName = document.querySelector("#originalFileName");
const resultEmpty = document.querySelector("#resultEmpty");
const toast = document.querySelector("#toast");
const balance = document.querySelector("#balance");
const modeTitle = document.querySelector("#modeTitle");
const modeDesc = document.querySelector("#modeDesc");
const loginBtn = document.querySelector("#loginBtn");
const accountBtn = document.querySelector("#accountBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const authModal = document.querySelector("#authModal");
const authClose = document.querySelector("#authClose");
const loginTab = document.querySelector("#loginTab");
const registerTab = document.querySelector("#registerTab");
const authForm = document.querySelector("#authForm");
const authSubmit = document.querySelector("#authSubmit");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authTitle = document.querySelector("#authTitle");
const termsCheck = document.querySelector("#termsCheck");
const acceptTerms = document.querySelector("#acceptTerms");
const wechatLoginBtn = document.querySelector("#wechatLoginBtn");
const accountModal = document.querySelector("#accountModal");
const accountClose = document.querySelector("#accountClose");
const passwordForm = document.querySelector("#passwordForm");
const currentPassword = document.querySelector("#currentPassword");
const newPassword = document.querySelector("#newPassword");
const confirmNewPassword = document.querySelector("#confirmNewPassword");
const passwordSubmit = document.querySelector("#passwordSubmit");
const paymentModal = document.querySelector("#paymentModal");
const paymentClose = document.querySelector("#paymentClose");
const orderConfirmModal = document.querySelector("#orderConfirmModal");
const orderConfirmClose = document.querySelector("#orderConfirmClose");
const orderCancelBtn = document.querySelector("#orderCancelBtn");
const orderConfirmSummary = document.querySelector("#orderConfirmSummary");
const confirmOrderBtn = document.querySelector("#confirmOrderBtn");
const createPaymentBtn = document.querySelector("#createPaymentBtn");
const confirmPaymentBtn = document.querySelector("#confirmPaymentBtn");
const paymentOrder = document.querySelector("#paymentOrder");
const paymentHint = document.querySelector("#paymentHint");
const paymentSelectedAmount = document.querySelector("#paymentSelectedAmount");
const paymentCurrentBalance = document.querySelector("#paymentCurrentBalance");
const paymentStatusBadge = document.querySelector("#paymentStatusBadge");
const paymentSteps = ["#paymentStepAmount", "#paymentStepPay", "#paymentStepReview"].map((selector) => document.querySelector(selector));
const paymentManual = document.querySelector("#paymentManual");
const paymentQrImage = document.querySelector("#paymentQrImage");
const paymentReference = document.querySelector("#paymentReference");
const paymentAccount = document.querySelector("#paymentAccount");
const copyPaymentRefBtn = document.querySelector("#copyPaymentRefBtn");
const paymentClaimedAmount = document.querySelector("#paymentClaimedAmount");
const paymentTradeNo = document.querySelector("#paymentTradeNo");
const paymentNotifyNote = document.querySelector("#paymentNotifyNote");
const submitPaymentNoticeBtn = document.querySelector("#submitPaymentNoticeBtn");
const refreshPaymentsBtn = document.querySelector("#refreshPaymentsBtn");
const paymentHistoryList = document.querySelector("#paymentHistoryList");
const ordersModal = document.querySelector("#ordersModal");
const ordersClose = document.querySelector("#ordersClose");
const ordersList = document.querySelector("#ordersList");
const orderDetailMeta = document.querySelector("#orderDetailMeta");
const orderDetailResult = document.querySelector("#orderDetailResult");
const loadOrderResultBtn = document.querySelector("#loadOrderResultBtn");
const downloadOrderResultBtn = document.querySelector("#downloadOrderResultBtn");
const copyOrderResultBtn = document.querySelector("#copyOrderResultBtn");
const deleteOrderResultBtn = document.querySelector("#deleteOrderResultBtn");
const helpModal = document.querySelector("#helpModal");
const helpClose = document.querySelector("#helpClose");
const helpTitle = document.querySelector("#helpTitle");
const helpSubtitle = document.querySelector("#helpSubtitle");
const helpContent = document.querySelector("#helpContent");
const steps = ["#stepQueue", "#stepProcess", "#stepExport"].map((selector) => document.querySelector(selector));

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function createIconsSafe() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

function waitForDaisyAuth() {
  if (window.DaisyAuth) return Promise.resolve(window.DaisyAuth);
  return new Promise((resolve) => {
    window.addEventListener("daisy-auth-ready", () => resolve(window.DaisyAuth), { once: true });
    setTimeout(() => resolve(window.DaisyAuth || null), 1600);
  });
}

async function authFetch(input, init = {}) {
  const auth = await waitForDaisyAuth();
  if (auth?.apiFetch) return auth.apiFetch(input, init);
  return fetch(input, { ...init, credentials: "same-origin" });
}

async function ensureAuthenticated() {
  if (state.authenticated) return true;
  const auth = await waitForDaisyAuth();
  const session = auth?.getSession ? await auth.getSession().catch(() => null) : null;
  if (!session?.user) return false;
  await refreshAccount();
  return state.authenticated;
}

function loginUrl() {
  const redirect = `${window.location.pathname}${window.location.search}`;
  return `/login?redirect=${encodeURIComponent(redirect || "/")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function formatMoney(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatTime(value) {
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString("zh-CN", { hour12: false });
}

function serviceName(value) {
  return ({
    aigc: "降AI率",
    repeat: "降重复率",
    combo: "降AI+降重",
    custom: "高级定制",
  })[value] || value || "-";
}

function platformName(value) {
  return ({
    cnki: "知网",
    weipu: "维普",
    general: "通用平台",
    gecida: "格子达(学生版)",
    zhuque: "朱雀平台",
    huachen: "华宸",
  })[value] || value || "-";
}

function languagePricing(value) {
  return LANGUAGE_RATES[value] || LANGUAGE_RATES.zh;
}

function quoteJob(text = sourceText.value.trim()) {
  const length = text.length;
  const units = length ? Math.ceil(length / UNIT_CHARS) : 0;
  const language = document.querySelector("#language").value;
  const languageRate = languagePricing(language);
  const unitPrice = state.rate ? state.rate * languageRate.multiplier : 0;
  const amount = unitPrice && length ? Math.ceil(length * unitPrice * 100 / UNIT_CHARS) / 100 : 0;
  return {
    text,
    length,
    units,
    amount,
    unitPrice,
    languageName: languageRate.name,
    service: state.service,
    serviceTitle: serviceName(state.service),
    platform: state.platform,
    language,
    reportText: state.input === "report" ? state.reportText : "",
    inputType: state.input,
    sourceFilename: state.input === "report" ? state.originalFileName : state.input === "file" ? state.sourceFileName : "",
    reportFilename: state.input === "report" ? state.reportFileName : "",
  };
}

function currentPrice() {
  return quoteJob().amount;
}

function updatePrice() {
  const quote = quoteJob();
  const length = quote.length;
  const price = quote.amount;
  count.textContent = `总字符数：${length}/6000`;
  cost.textContent = state.rate
    ? `预计费用：¥${price.toFixed(2)}，${quote.languageName} ¥${quote.unitPrice.toFixed(2)}/千字，按 ${length} 字折算`
    : "预计费用：联系客服";
  balance.textContent = `¥ ${state.balance.toFixed(2)}`;
  submitBtn.disabled = length === 0 || length > 6000 || (state.input === "report" && !state.reportText);
  loginBtn.textContent = state.authenticated ? state.email : "登录 / 注册";
  accountBtn.hidden = !state.authenticated;
  logoutBtn.hidden = !state.authenticated;
  if (resultEmpty) {
    resultEmpty.hidden = state.input !== "report" || Boolean(resultText.value);
  }
}

async function refreshPublicConfig() {
  try {
    const auth = await waitForDaisyAuth();
    const response = auth?.apiFetch
      ? await auth.apiFetch("/api/public-config")
      : await fetch("/api/public-config");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "配置读取失败");
    state.mockPaymentsEnabled = Boolean(payload.mock_payments_enabled);
    state.supabaseAuthEnabled = Boolean(payload.supabase_auth_enabled);
    confirmPaymentBtn.hidden = !state.mockPaymentsEnabled;
  } catch (error) {
    state.mockPaymentsEnabled = false;
    state.supabaseAuthEnabled = Boolean(window.DaisyAuth?.configured);
    confirmPaymentBtn.hidden = true;
  }
}

async function refreshAccount() {
  try {
    const auth = await waitForDaisyAuth();
    if (!auth) {
      state.balance = 0;
      state.authenticated = false;
      state.email = "";
      updatePrice();
      return;
    }
    if (auth) {
      const session = auth.getSession ? await auth.getSession().catch(() => null) : null;
      if (!session?.user) {
        state.balance = 0;
        state.authenticated = false;
        state.email = "";
        updatePrice();
        return;
      }
    }
    const response = await auth.apiFetch("/api/me");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "账户读取失败");
    state.balance = Number(payload.balance || 0);
    state.authenticated = Boolean(payload.authenticated);
    state.email = payload.email || "";
    updatePrice();
  } catch (error) {
    const auth = await waitForDaisyAuth();
    const session = auth?.getSession ? await auth.getSession().catch(() => null) : null;
    if (session?.user) {
      state.balance = 0;
      state.authenticated = true;
      state.email = session.user.email || "";
      updatePrice();
      return;
    }
    showToast(error.message);
  }
}

function setActive(buttons, current) {
  buttons.forEach((button) => button.classList.toggle("active", button === current));
}

function setStep(index) {
  steps.forEach((step, idx) => {
    step.classList.toggle("done", idx < index);
    step.classList.toggle("active", idx === index);
  });
}

document.querySelectorAll(".service-card").forEach((card) => {
  card.addEventListener("click", () => {
    state.service = card.dataset.service;
    state.rate = Number(card.dataset.rate);
    setActive(document.querySelectorAll(".service-card"), card);
    modeTitle.textContent = card.dataset.title;
    modeDesc.textContent = serviceDescriptions[state.service];
    if (state.service === "custom") showToast("高级定制需要提交工单，客服会确认报价和交付时间。");
    updatePrice();
  });
});

document.querySelectorAll("[data-platform]").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.platform = chip.dataset.platform;
    setActive(document.querySelectorAll("[data-platform]"), chip);
  });
});

document.querySelectorAll("[data-input]").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.input = chip.dataset.input;
    setActive(document.querySelectorAll("[data-input]"), chip);
    updateInputMode();
    if (state.input === "file") {
      showToast("请选择 TXT、DOCX 或 PDF 文件，系统会自动提取可识别文本。");
    }
    if (state.input === "report") {
      showToast("请分别上传检测报告和原文 DOCX，系统会按原文字数计费。");
    }
  });
});

sourceText.addEventListener("input", updatePrice);
document.querySelector("#language").addEventListener("change", updatePrice);

sampleBtn.addEventListener("click", () => {
  sourceText.value =
    "随着人工智能技术在文本生成领域的快速发展，学术写作场景中的表达方式也发生了明显变化。本文围绕智能化电商环境下用户行为分析与内容优化策略展开研究，试图从数据采集、消费决策、平台运营与服务体验等方面建立较为完整的分析框架。";
  updatePrice();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  await extractFileToText(file, {
    loadingText: `正在解析文件：${file.name}`,
    onSuccess: (payload) => {
      sourceText.value = payload.text;
      state.sourceFileName = file.name;
      showToast(payload.truncated ? `已提取前 ${payload.limit} 字，可分批处理全文。` : `已提取 ${payload.chars} 字`);
    },
    onError: () => {
      sourceText.value = "";
      state.sourceFileName = "";
    },
  });
});

async function extractFileToText(file, { loadingText = "", onSuccess, onError } = {}) {
  if (!(await ensureAuthenticated())) {
    showToast("请先登录后上传文件。");
    openAuthModal("login");
    onError?.(new Error("login required"));
    updatePrice();
    return null;
  }
  const formData = new FormData();
  formData.append("file", file);
  if (loadingText) {
    sourceText.value = loadingText;
    updatePrice();
  }
  try {
    const response = await authFetch("/api/extract-file", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "文件解析失败");
    onSuccess?.(payload);
    return payload;
  } catch (error) {
    onError?.(error);
    showToast(error.message);
    return null;
  } finally {
    updatePrice();
  }
}

function updateInputMode() {
  const isFile = state.input === "file";
  const isReport = state.input === "report";
  dropZone.classList.toggle("visible", isFile);
  reportUploadPanel.hidden = !isReport;
  sourceText.hidden = isReport;
  sampleBtn.hidden = isReport;
  resultText.hidden = isReport && !resultText.value;
  if (!isReport) {
    state.reportText = "";
    state.reportFileName = "";
    state.originalFileName = "";
    reportFileName.textContent = "点击或拖拽上传检测报告";
    originalFileName.textContent = "点击或拖拽上传原文文件";
  }
  if (state.input !== "file") {
    state.sourceFileName = "";
  }
  updatePrice();
  createIconsSafe();
}

reportFileInput.addEventListener("change", async () => {
  const file = reportFileInput.files?.[0];
  if (!file) return;
  reportFileName.textContent = `正在解析：${file.name}`;
  const payload = await extractFileToText(file, {
    onSuccess: (payload) => {
      state.reportText = payload.text;
      state.reportFileName = file.name;
      reportFileName.textContent = file.name;
      showToast(`检测报告已读取 ${payload.chars} 字`);
    },
    onError: () => {
      state.reportText = "";
      state.reportFileName = "";
      reportFileName.textContent = "点击或拖拽上传检测报告";
    },
  });
  if (!payload) updatePrice();
});

originalFileInput.addEventListener("change", async () => {
  const file = originalFileInput.files?.[0];
  if (!file) return;
  originalFileName.textContent = `正在解析：${file.name}`;
  const payload = await extractFileToText(file, {
    onSuccess: (payload) => {
      sourceText.value = payload.text;
      state.originalFileName = file.name;
      originalFileName.textContent = file.name;
      showToast(payload.truncated ? `原文已提取前 ${payload.limit} 字，可分批处理。` : `原文已读取 ${payload.chars} 字`);
    },
    onError: () => {
      sourceText.value = "";
      state.originalFileName = "";
      originalFileName.textContent = "点击或拖拽上传原文文件";
    },
  });
  if (!payload) updatePrice();
});

function renderOrderConfirm(job) {
  orderConfirmSummary.innerHTML = `
    <div class="confirm-row"><span>服务类型</span><strong>${escapeHtml(job.serviceTitle)}</strong></div>
    <div class="confirm-row"><span>目标平台</span><strong>${escapeHtml(platformName(job.platform))}</strong></div>
    <div class="confirm-row"><span>处理语言</span><strong>${escapeHtml(job.languageName)}</strong></div>
    ${job.inputType === "report" ? `<div class="confirm-row"><span>检测报告</span><strong>${escapeHtml(state.reportFileName || "-")}</strong></div>` : ""}
    ${job.inputType === "report" ? `<div class="confirm-row"><span>原文文件</span><strong>${escapeHtml(state.originalFileName || "-")}</strong></div>` : ""}
    <div class="confirm-row"><span>文本字数</span><strong>${job.length} 字</strong></div>
    <div class="confirm-row"><span>计费规则</span><strong>${job.length} 字 × ¥${job.unitPrice.toFixed(2)}/千字，按比例折算</strong></div>
    <div class="confirm-row total"><span>本次扣费</span><strong>¥${job.amount.toFixed(2)}</strong></div>
    <div class="confirm-row"><span>当前余额</span><strong>¥${state.balance.toFixed(2)}</strong></div>
  `;
}

function openOrderConfirmModal(job) {
  state.pendingJob = job;
  renderOrderConfirm(job);
  orderConfirmModal.hidden = false;
  createIconsSafe();
}

function closeOrderConfirmModal() {
  orderConfirmModal.hidden = true;
  state.pendingJob = null;
  confirmOrderBtn.disabled = false;
}

async function submitJob() {
  const job = quoteJob();
  if (!job.text) return;
  if (job.inputType === "report" && !job.reportText) {
    showToast("请先上传检测报告和原文文件。");
    return;
  }
  if (job.length > 6000) {
    showToast("单次最多处理 6000 字，请分批提交。");
    return;
  }
  if (!(await ensureAuthenticated())) {
    showToast("请先登录后再提交订单。");
    openAuthModal("login");
    return;
  }
  if (job.service === "custom") {
    openHelpModal("contact");
    showToast("高级定制请提交工单，客服会确认报价和交付时间。");
    return;
  }
  if (job.amount > state.balance) {
    showToast("余额不足，请先充值。");
    openPaymentModal();
    return;
  }

  openOrderConfirmModal(job);
}

async function runOptimize(job) {
  const price = job.amount;
  submitBtn.disabled = true;
  confirmOrderBtn.disabled = true;
  submitBtn.innerHTML = '<i data-lucide="loader-2"></i>处理中';
  resultText.value = "";
  state.lastDownloadUrl = "";
  state.lastOutputFilename = "";
  setStep(0);
  createIconsSafe();

  try {
    setStep(1);
    resultText.hidden = false;
    if (resultEmpty) resultEmpty.hidden = true;
    const response = await authFetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: job.service,
        platform: job.platform,
        language: job.language,
        input_type: job.inputType,
        source_filename: job.sourceFilename,
        report_filename: job.reportFilename,
        report_text: job.reportText,
        text: job.text,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "处理失败");
    setStep(2);
    resultText.value = payload.result;
    state.lastDownloadUrl = payload.download_url || "";
    state.lastOutputFilename = payload.output_filename || "";
    downloadBtn.innerHTML = job.inputType === "text"
      ? '<i data-lucide="download"></i>导出 TXT'
      : '<i data-lucide="download"></i>下载处理文件';
    state.balance = Number(payload.balance ?? Math.max(0, state.balance - price));
    closeOrderConfirmModal();
    updatePrice();
    showToast(`订单 ${payload.order_id} 已完成，扣费 ¥${Number(payload.amount || price).toFixed(2)}`);
  } catch (error) {
    showToast(error.message);
  } finally {
    submitBtn.innerHTML = '<i data-lucide="arrow-right"></i>提交';
    confirmOrderBtn.disabled = false;
    createIconsSafe();
    updatePrice();
  }
}

submitBtn.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  submitJob();
});
clearResultBtn.addEventListener("click", (event) => {
  event.preventDefault();
  resultText.value = "";
  resultText.focus();
  state.lastDownloadUrl = "";
  state.lastOutputFilename = "";
  if (resultEmpty) resultEmpty.hidden = state.input !== "report";
  showToast("处理结果已清空");
});
confirmOrderBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (state.pendingJob) runOptimize(state.pendingJob);
});
orderConfirmClose.addEventListener("click", closeOrderConfirmModal);
orderCancelBtn.addEventListener("click", closeOrderConfirmModal);
orderConfirmModal.addEventListener("click", (event) => {
  if (event.target === orderConfirmModal) closeOrderConfirmModal();
});

copyBtn.addEventListener("click", async () => {
  if (!resultText.value) return;
  await navigator.clipboard.writeText(resultText.value);
  showToast("结果已复制");
});

function filenameFromDisposition(disposition) {
  const encoded = String(disposition || "").match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  const plain = String(disposition || "").match(/filename="?([^";]+)"?/i)?.[1];
  return plain || "";
}

async function downloadBlob(url, fallbackName) {
  const response = await authFetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "下载失败");
  }
  const blob = await response.blob();
  const name = filenameFromDisposition(response.headers.get("Content-Disposition")) || fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

downloadBtn.addEventListener("click", async () => {
  if (!resultText.value) return;
  try {
    if (state.lastDownloadUrl) {
      await downloadBlob(state.lastDownloadUrl, state.lastOutputFilename || `雏菊论文-${Date.now()}.txt`);
      return;
    }
    const blob = new Blob([resultText.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `雏菊论文-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(error.message);
  }
});

function resetManualPayment() {
  paymentManual.hidden = true;
  paymentQrImage.hidden = true;
  paymentQrImage.removeAttribute("src");
  paymentReference.textContent = "创建支付单后生成";
  paymentAccount.textContent = "请按页面提示完成付款";
  if (paymentClaimedAmount) paymentClaimedAmount.value = "";
  paymentTradeNo.value = "";
  paymentNotifyNote.value = "";
  submitPaymentNoticeBtn.disabled = false;
  submitPaymentNoticeBtn.textContent = "我已付款，提交审核";
}

function readablePaymentText(value, fallback) {
  const text = String(value || "").trim();
  const questionMarks = (text.match(/\?/g) || []).length;
  if (!text || /^[?\s]+$/.test(text) || questionMarks >= Math.max(6, text.length * 0.45)) {
    return fallback;
  }
  return text;
}

function renderManualPayment(payment) {
  const hasManualInfo = Boolean(payment.payment_qr_url || payment.payment_account || payment.payment_reference);
  paymentManual.hidden = !hasManualInfo;
  if (!hasManualInfo) return;

  paymentReference.textContent = payment.payment_reference || payment.payment_id;
  paymentAccount.textContent = readablePaymentText(payment.payment_account, "请以扫码页显示的收款方为准");
  if (paymentClaimedAmount) paymentClaimedAmount.value = Number(payment.amount || state.paymentAmount).toFixed(2);
  if (payment.payment_qr_url) {
    paymentQrImage.src = payment.payment_qr_url;
    paymentQrImage.hidden = false;
  } else {
    paymentQrImage.hidden = true;
    paymentQrImage.removeAttribute("src");
  }
}

function paymentStatusLabelClean(payment) {
  if (payment.status === "paid") return "已到账";
  if (payment.status === "canceled") return "已驳回";
  if (payment.notified_at) return "待核账";
  if (payment.status === "pending") return "待支付";
  return payment.status || "-";
}

function paymentClaimedText(payment) {
  if (payment.user_claimed_amount == null) return "";
  const suffix = payment.amount_mismatch ? "（与支付单不一致）" : "";
  return ` · 填报付款 ${formatMoney(payment.user_claimed_amount)}${suffix}`;
}

function renderPaymentHistory(payments) {
  paymentHistoryList.innerHTML = payments.length
    ? payments.map((payment) => {
        const proof = payment.user_trade_no || payment.user_payment_note || "";
        const proofText = proof ? ` · 凭证 ${proof}` : "";
        const claimedText = paymentClaimedText(payment);
        const cancelText = payment.cancel_note ? ` · 原因 ${payment.cancel_note}` : "";
        const paidText = payment.paid_at ? ` · 到账 ${formatTime(payment.paid_at)}` : "";
        const notifyText = payment.notified_at ? ` · 提交 ${formatTime(payment.notified_at)}` : "";
        const canceledText = payment.canceled_at ? ` · 驳回 ${formatTime(payment.canceled_at)}` : "";
        return `
          <div class="payment-history-row">
            <span>
              <strong>${escapeHtml(payment.payment_id)}</strong>
              <small>${escapeHtml(payment.provider)} · ${escapeHtml(paymentStatusLabel(payment))}${escapeHtml(proofText)}${escapeHtml(claimedText)}${escapeHtml(cancelText)}</small>
              <small>${escapeHtml(formatTime(payment.created_at))}${escapeHtml(notifyText)}${escapeHtml(paidText)}${escapeHtml(canceledText)}</small>
            </span>
            <b>${escapeHtml(formatMoney(payment.amount))}</b>
          </div>
        `;
      }).join("")
    : '<div class="empty-orders">暂无充值记录</div>';
}

function stopPaymentPolling() {
  if (state.paymentPollTimer) {
    window.clearInterval(state.paymentPollTimer);
    state.paymentPollTimer = null;
  }
}

function startPaymentPolling() {
  stopPaymentPolling();
  state.paymentPollTimer = window.setInterval(async () => {
    if (paymentModal.hidden || !state.pendingPayment?.payment_id) {
      stopPaymentPolling();
      return;
    }
    if (["paid", "canceled"].includes(state.pendingPayment.status)) {
      stopPaymentPolling();
      return;
    }
    await loadPaymentHistory({ quiet: true, loading: false });
  }, 15000);
}

async function syncCurrentPaymentFromHistory(payments = []) {
  if (!state.pendingPayment?.payment_id) return;
  const latest = payments.find((payment) => payment.payment_id === state.pendingPayment.payment_id);
  if (!latest) return;
  state.pendingPayment = { ...state.pendingPayment, ...latest };
  if (latest.status === "paid") {
    stopPaymentPolling();
    await refreshAccount();
    setPaymentStage(2);
    setPaymentBadge("已到账", "paid");
    setPaymentText(paymentHint, `已到账 ${formatMoney(latest.amount)}，当前余额 ${formatMoney(state.balance)}。`);
    submitPaymentNoticeBtn.disabled = true;
    submitPaymentNoticeBtn.textContent = "已到账";
    return;
  }
  if (latest.status === "canceled") {
    stopPaymentPolling();
    setPaymentStage(2);
    setPaymentBadge("已驳回", "canceled");
    setPaymentText(paymentHint, latest.cancel_note ? `付款凭证已驳回：${latest.cancel_note}` : "付款凭证已驳回，请核对后重新提交。");
    submitPaymentNoticeBtn.disabled = true;
    submitPaymentNoticeBtn.textContent = "已驳回";
    return;
  }
  if (latest.notified_at) {
    setPaymentStage(2);
    setPaymentBadge("待核账", "review");
    setPaymentText(paymentHint, "付款信息已提交，管理员核对到账后会为账户充值。");
  }
}

async function loadPaymentHistory({ quiet = false, loading = true } = {}) {
  if (loading) paymentHistoryList.innerHTML = '<div class="empty-orders">正在读取充值记录...</div>';
  try {
    const response = await authFetch("/api/payments");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "充值记录读取失败");
    renderPaymentHistory(payload.payments || []);
    await syncCurrentPaymentFromHistory(payload.payments || []);
  } catch (error) {
    paymentHistoryList.innerHTML = '<div class="empty-orders">充值记录读取失败</div>';
    if (!quiet) showToast(error.message);
  }
}

async function openPaymentModal() {
  if (!(await ensureAuthenticated())) {
    showToast("请先登录后再充值。");
    openAuthModal("login");
    return;
  }
  state.pendingPayment = null;
  paymentOrder.textContent = "未创建";
  paymentHint.textContent = `当前选择 ¥${state.paymentAmount}`;
  resetManualPayment();
  confirmPaymentBtn.disabled = true;
  confirmPaymentBtn.hidden = !state.mockPaymentsEnabled;
  paymentModal.hidden = false;
  loadPaymentHistory({ quiet: true });
  startPaymentPolling();
}

function closePaymentModal() {
  paymentModal.hidden = true;
  stopPaymentPolling();
}

document.querySelector("#rechargeBtn").addEventListener("click", openPaymentModal);
paymentClose.addEventListener("click", closePaymentModal);
paymentModal.addEventListener("click", (event) => {
  if (event.target === paymentModal) closePaymentModal();
});
refreshPaymentsBtn.addEventListener("click", async () => {
  await loadPaymentHistory();
  await refreshAccount();
});

document.querySelectorAll("[data-pay-amount]").forEach((button) => {
  button.addEventListener("click", () => {
    state.paymentAmount = Number(button.dataset.payAmount);
    state.pendingPayment = null;
    document.querySelectorAll("[data-pay-amount]").forEach((item) => item.classList.toggle("active", item === button));
    paymentOrder.textContent = "未创建";
    paymentHint.textContent = `当前选择 ¥${state.paymentAmount}`;
    resetManualPayment();
    confirmPaymentBtn.disabled = true;
    confirmPaymentBtn.hidden = !state.mockPaymentsEnabled;
  });
});

createPaymentBtn.addEventListener("click", async () => {
  try {
    const response = await authFetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: state.paymentAmount }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "支付单创建失败");
    state.pendingPayment = payload;
    paymentOrder.textContent = payload.payment_id;
    state.mockPaymentsEnabled = Boolean(payload.mock_payments_enabled);
    confirmPaymentBtn.hidden = !state.mockPaymentsEnabled;
    confirmPaymentBtn.disabled = !state.mockPaymentsEnabled;
    paymentHint.textContent = state.mockPaymentsEnabled
      ? `待支付 ¥${Number(payload.amount).toFixed(2)}，演示交易号 ${payload.mock_trade_no}`
      : readablePaymentText(payload.payment_message, `待支付 ¥${Number(payload.amount).toFixed(2)}，请扫码付款并提交交易号。`);
    renderManualPayment(payload);
    await loadPaymentHistory({ quiet: true });
    startPaymentPolling();
    showToast("支付单已创建");
  } catch (error) {
    showToast(error.message);
  }
});

copyPaymentRefBtn.addEventListener("click", async () => {
  const reference = paymentReference.textContent.trim();
  if (!reference || reference === "创建支付单后生成") return;
  await navigator.clipboard.writeText(reference);
  showToast("付款备注已复制");
});

submitPaymentNoticeBtn.addEventListener("click", async () => {
  if (!state.pendingPayment?.payment_id) {
    showToast("请先创建支付单");
    return;
  }
  const claimedAmount = Number(paymentClaimedAmount?.value || 0);
  if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
    showToast("请填写实际付款金额。");
    paymentClaimedAmount?.focus();
    return;
  }
  const tradeNo = paymentTradeNo.value.trim();
  const note = paymentNotifyNote.value.trim();
  if (!tradeNo && !note) {
    showToast("请填写付款交易号或补充备注");
    paymentTradeNo.focus();
    return;
  }

  submitPaymentNoticeBtn.disabled = true;
  submitPaymentNoticeBtn.textContent = "提交中...";
  try {
    const response = await authFetch("/api/payments/notify-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: state.pendingPayment.payment_id,
        user_trade_no: tradeNo,
        claimed_amount: claimedAmount,
        note,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "付款信息提交失败");
    state.pendingPayment = {
      ...state.pendingPayment,
      ...payload,
      user_claimed_amount: claimedAmount,
      amount_mismatch: Number(state.pendingPayment.amount || state.paymentAmount).toFixed(2) !== claimedAmount.toFixed(2),
    };
    submitPaymentNoticeBtn.textContent = "已提交，等待核账";
    paymentHint.textContent = state.pendingPayment.amount_mismatch
      ? "填报金额与支付单金额不一致，管理员会核对后处理；通常需要驳回后重新提交。"
      : "付款信息已提交，管理员核对到账后会为账户充值。";
    await loadPaymentHistory({ quiet: true });
    startPaymentPolling();
    showToast("付款信息已提交");
  } catch (error) {
    submitPaymentNoticeBtn.disabled = false;
    submitPaymentNoticeBtn.textContent = "我已付款，提交审核";
    showToast(error.message);
  }
});

confirmPaymentBtn.addEventListener("click", async () => {
  if (!state.pendingPayment) return;
  if (!state.mockPaymentsEnabled) {
    showToast("当前环境已关闭演示支付确认");
    return;
  }
  try {
    const payment = state.pendingPayment;
    const response = await authFetch("/api/payments/mock-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: payment.payment_id,
        amount_cents: payment.amount_cents,
        provider_trade_no: payment.mock_trade_no,
        signature: payment.mock_signature,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "支付确认失败");
    state.balance = Number(payload.balance || 0);
    state.authenticated = Boolean(payload.authenticated);
    state.email = payload.email || state.email;
    closePaymentModal();
    updatePrice();
    await loadPaymentHistory({ quiet: true });
    showToast(`充值 ¥${Number(payment.amount).toFixed(2)} 已到账`);
  } catch (error) {
    showToast(error.message);
  }
});

function paymentCleanText(value, fallback) {
  const text = String(value || "").trim();
  const questionMarks = (text.match(/\?/g) || []).length;
  if (!text || /^[?\s]+$/.test(text) || questionMarks >= Math.max(6, text.length * 0.45)) return fallback;
  return text;
}

function setPaymentStage(stage) {
  paymentSteps.forEach((item, index) => {
    if (!item) return;
    item.classList.toggle("active", index === stage);
    item.classList.toggle("done", index < stage);
  });
}

function setPaymentBadge(text, mode = "idle") {
  if (!paymentStatusBadge) return;
  paymentStatusBadge.textContent = text;
  paymentStatusBadge.className = `payment-status-badge ${mode}`;
}

function setPaymentText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

function syncPaymentUiExtras() {
  setPaymentText(paymentSelectedAmount, formatMoney(state.paymentAmount));
  setPaymentText(paymentCurrentBalance, formatMoney(state.balance));

  if (!state.pendingPayment?.payment_id) {
    setPaymentText(paymentOrder, "未创建");
    setPaymentText(paymentHint, "选择金额后点击创建支付单。");
    setPaymentStage(0);
    setPaymentBadge("未创建", "idle");
    return;
  }

  const payment = state.pendingPayment;
  setPaymentText(paymentOrder, payment.payment_id);
  const submitted = submitPaymentNoticeBtn.disabled && /已提交|等待|核账/.test(submitPaymentNoticeBtn.textContent);
  if (submitted) {
    setPaymentText(paymentHint, "付款信息已提交，管理员核对到账后会为账户充值。");
    setPaymentStage(2);
    setPaymentBadge("待核账", "review");
    return;
  }

  const amountText = formatMoney(payment.amount || state.paymentAmount);
  setPaymentText(paymentHint, state.mockPaymentsEnabled
    ? `待支付 ${amountText}，演示交易号 ${payment.mock_trade_no || "-"}`
    : paymentCleanText(payment.payment_message, `待支付 ${amountText}，请扫码付款并提交交易号。`));
  setPaymentStage(1);
  setPaymentBadge("待支付", "pending");

  if (paymentReference && paymentReference.textContent.includes("鍒涘缓")) {
    setPaymentText(paymentReference, payment.payment_reference || payment.payment_id);
  }
  if (paymentAccount && paymentAccount.textContent.includes("璇")) {
    setPaymentText(paymentAccount, paymentCleanText(payment.payment_account, "请以扫码页显示的收款方为准，付款备注务必填写支付单号。"));
  }
}

document.querySelectorAll("[data-pay-amount]").forEach((button) => {
  button.addEventListener("click", () => window.setTimeout(syncPaymentUiExtras, 0));
});

createPaymentBtn.addEventListener("click", () => {
  createPaymentBtn.disabled = true;
  const originalText = createPaymentBtn.textContent;
  createPaymentBtn.textContent = "创建中...";
  window.setTimeout(() => {
    createPaymentBtn.disabled = false;
    createPaymentBtn.textContent = originalText || "创建支付单";
    syncPaymentUiExtras();
  }, 900);
});

submitPaymentNoticeBtn.addEventListener("click", () => {
  window.setTimeout(syncPaymentUiExtras, 900);
});

if (paymentModal) {
  new MutationObserver(() => window.setTimeout(syncPaymentUiExtras, 0)).observe(paymentModal, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
}

function paymentStatusLabel(payment) {
  if (payment.status === "paid") return "已到账";
  if (payment.status === "canceled") return "已驳回";
  if (payment.notified_at) return "待核账";
  if (payment.status === "pending") return "待支付";
  return payment.status || "-";
}

function paymentStatusClassClean(payment) {
  if (payment.status === "paid") return "paid";
  if (payment.status === "canceled") return "canceled";
  if (payment.notified_at) return "review";
  return "pending";
}

renderPaymentHistory = function renderPaymentHistoryClean(payments) {
  paymentHistoryList.innerHTML = payments.length
    ? payments.map((payment) => {
        const proof = payment.user_trade_no || payment.user_payment_note || "";
        const proofText = proof ? ` · 凭证 ${proof}` : "";
        const claimedText = paymentClaimedText(payment);
        const cancelText = payment.cancel_note ? ` · 原因 ${payment.cancel_note}` : "";
        const paidText = payment.paid_at ? ` · 到账 ${formatTime(payment.paid_at)}` : "";
        const notifyText = payment.notified_at ? ` · 提交 ${formatTime(payment.notified_at)}` : "";
        const canceledText = payment.canceled_at ? ` · 驳回 ${formatTime(payment.canceled_at)}` : "";
        return `
          <div class="payment-history-row">
            <span>
              <strong>${escapeHtml(payment.payment_id)}</strong>
              <small><em class="payment-history-status ${paymentStatusClassClean(payment)}">${escapeHtml(paymentStatusLabelClean(payment))}</em>${escapeHtml(proofText)}${escapeHtml(claimedText)}${escapeHtml(cancelText)}</small>
              <small>${escapeHtml(formatTime(payment.created_at))}${escapeHtml(notifyText)}${escapeHtml(paidText)}${escapeHtml(canceledText)}</small>
            </span>
            <b>${escapeHtml(formatMoney(payment.amount))}</b>
          </div>
        `;
      }).join("")
    : '<div class="empty-orders">暂无充值记录</div>';
};

function setAuthMode(mode) {
  state.authMode = mode;
  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");
  authTitle.textContent = mode === "login" ? "登录雏菊AIGC" : "注册雏菊AIGC";
  authSubmit.textContent = mode === "login" ? "登录" : "注册";
  termsCheck.hidden = mode !== "register";
}

function openAuthModal(mode = "login") {
  setAuthMode(mode);
  authModal.hidden = false;
  authEmail.focus();
}

function closeAuthModal() {
  authModal.hidden = true;
  authPassword.value = "";
  acceptTerms.checked = false;
}

loginBtn.addEventListener("click", () => {
  if (state.authenticated) {
    window.location.href = "/dashboard";
    return;
  }
  openAuthModal("login");
});
authClose.addEventListener("click", closeAuthModal);
authModal.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
});
loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

function openAccountModal() {
  if (!state.authenticated) {
    openAuthModal("login");
    return;
  }
  window.location.href = "/dashboard";
}

function closeAccountModal() {
  accountModal.hidden = true;
  currentPassword.value = "";
  newPassword.value = "";
  confirmNewPassword.value = "";
}

accountBtn.addEventListener("click", openAccountModal);
accountClose.addEventListener("click", closeAccountModal);
accountModal.addEventListener("click", (event) => {
  if (event.target === accountModal) closeAccountModal();
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (newPassword.value !== confirmNewPassword.value) {
    showToast("两次输入的新密码不一致");
    return;
  }
  passwordSubmit.disabled = true;
  passwordSubmit.textContent = "修改中...";
  try {
    const response = await authFetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword.value,
        new_password: newPassword.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "修改密码失败");
    state.authenticated = Boolean(payload.authenticated);
    state.email = payload.email || state.email;
    closeAccountModal();
    updatePrice();
    showToast("密码已修改，其他设备需要重新登录");
  } catch (error) {
    showToast(error.message);
  } finally {
    passwordSubmit.disabled = false;
    passwordSubmit.textContent = "修改密码";
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (state.authMode === "register" && !acceptTerms.checked) {
    showToast("请先同意用户协议和隐私政策");
    return;
  }
  const body = { email, password };
  if (state.authMode === "register") {
    body.accept_terms = acceptTerms.checked;
  }
  authSubmit.disabled = true;
  authSubmit.textContent = state.authMode === "login" ? "登录中..." : "注册中...";
  try {
    const auth = await waitForDaisyAuth();
    if (!auth?.configured) throw new Error("认证服务尚未配置");
    const result = state.authMode === "login"
      ? await auth.signIn(email, password)
      : await auth.signUp(email, password, `${window.location.origin}/dashboard`);
    if (state.authMode === "register" && result?.needsEmailConfirmation) {
      setAuthMode("login");
      authPassword.value = "";
      showToast("注册成功，请先完成邮箱验证后再登录。");
      return;
    }
    await refreshAccount();
    state.email = state.email || email;
    closeAuthModal();
    updatePrice();
    showToast(state.authMode === "login" ? "登录成功，可以继续提交订单。" : "注册成功，可以继续提交订单。");
  } catch (error) {
    const auth = await waitForDaisyAuth();
    showToast(auth?.authErrorMessage ? auth.authErrorMessage(error) : error.message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = state.authMode === "login" ? "登录" : "注册";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    const auth = await waitForDaisyAuth();
    if (auth?.signOut) await auth.signOut();
    const response = await (auth?.apiFetch ? auth.apiFetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }) : authFetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "退出失败");
    state.balance = Number(payload.balance || 0);
    state.authenticated = false;
    state.email = "";
    updatePrice();
    showToast("已退出登录");
  } catch (error) {
    showToast(error.message);
  }
});

function closeOrdersModal() {
  ordersModal.hidden = true;
}

function renderOrders(orders) {
  state.selectedOrder = null;
  orderDetailMeta.textContent = "选择一条订单查看详情";
  orderDetailResult.value = "";
  loadOrderResultBtn.disabled = true;
  downloadOrderResultBtn.disabled = true;
  copyOrderResultBtn.disabled = true;
  deleteOrderResultBtn.disabled = true;
  ordersList.innerHTML = orders.length
    ? orders.map((order) => `
        <button class="order-row" data-order-id="${escapeHtml(order.order_id)}">
          <span>
            <strong>${escapeHtml(serviceName(order.service))}</strong>
            <small>${escapeHtml(order.order_id)} · ${escapeHtml(order.status)}</small>
          </span>
          <span>
            <b>${escapeHtml(formatMoney(order.amount))}</b>
            <small>${escapeHtml(formatTime(order.created_at))}</small>
          </span>
        </button>
      `).join("")
    : '<div class="empty-orders">暂无订单记录</div>';
}

async function openOrdersModal() {
  ordersModal.hidden = false;
  ordersList.innerHTML = '<div class="empty-orders">正在读取订单...</div>';
  try {
    const response = await authFetch("/api/orders");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "订单读取失败");
    renderOrders(payload.orders || []);
    createIconsSafe();
  } catch (error) {
    ordersList.innerHTML = '<div class="empty-orders">订单读取失败</div>';
    showToast(error.message);
  }
}

async function loadOrderDetail(orderId) {
  try {
    const response = await authFetch(`/api/orders/${encodeURIComponent(orderId)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "订单详情读取失败");
    const order = payload.order;
    state.selectedOrder = order;
    orderDetailMeta.textContent = `${order.order_id} · ${serviceName(order.service)} · ${order.chars}字 · ${formatMoney(order.amount)} · ${formatTime(order.completed_at || order.created_at)}`;
    orderDetailResult.value = order.result || order.error || "该订单暂无可载入结果";
    const hasResult = Boolean(order.result);
    loadOrderResultBtn.disabled = !hasResult;
    downloadOrderResultBtn.disabled = !hasResult;
    copyOrderResultBtn.disabled = !hasResult;
    deleteOrderResultBtn.disabled = !hasResult;
  } catch (error) {
    showToast(error.message);
  }
}

document.querySelectorAll("[data-orders-trigger]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openOrdersModal();
  });
});
ordersClose.addEventListener("click", closeOrdersModal);
ordersModal.addEventListener("click", (event) => {
  if (event.target === ordersModal) closeOrdersModal();
});
ordersList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-order-id]");
  if (!row) return;
  ordersList.querySelectorAll(".order-row").forEach((item) => item.classList.toggle("active", item === row));
  loadOrderDetail(row.dataset.orderId);
});
loadOrderResultBtn.addEventListener("click", () => {
  if (!state.selectedOrder?.result) return;
  resultText.value = state.selectedOrder.result;
  closeOrdersModal();
  showToast("订单结果已载入");
});
downloadOrderResultBtn.addEventListener("click", async () => {
  if (!state.selectedOrder?.result) return;
  try {
    await downloadBlob(
      `/api/orders/${encodeURIComponent(state.selectedOrder.order_id)}/download`,
      `雏菊论文-${state.selectedOrder.order_id}.txt`,
    );
  } catch (error) {
    showToast(error.message);
  }
});
copyOrderResultBtn.addEventListener("click", async () => {
  if (!orderDetailResult.value) return;
  await navigator.clipboard.writeText(orderDetailResult.value);
  showToast("订单结果已复制");
});
deleteOrderResultBtn.addEventListener("click", async () => {
  if (!state.selectedOrder?.result) return;
  const confirmed = window.confirm("删除后将无法从订单中心恢复该处理结果，但订单和扣费记录会保留。确认删除？");
  if (!confirmed) return;
  deleteOrderResultBtn.disabled = true;
  try {
    const response = await authFetch(`/api/orders/${encodeURIComponent(state.selectedOrder.order_id)}/delete-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "删除结果失败");
    state.selectedOrder.result = "";
    state.selectedOrder.has_result = false;
    orderDetailResult.value = "该订单结果已删除";
    loadOrderResultBtn.disabled = true;
    downloadOrderResultBtn.disabled = true;
    copyOrderResultBtn.disabled = true;
    deleteOrderResultBtn.disabled = true;
    await openOrdersModal();
    showToast(`订单 ${payload.order_id} 结果已删除`);
  } catch (error) {
    deleteOrderResultBtn.disabled = false;
    showToast(error.message);
  }
});

const helpSections = {
  faq: {
    title: "常见问题",
    subtitle: "处理结果需要人工复核，不承诺固定检测通过率。",
    html: `
      <article>
        <h3>为什么不承诺 100% 通过检测？</h3>
        <p>不同 AIGC 检测和查重平台的算法、阈值和样本会变化。雏菊AIGC 只提供表达优化结果，最终文本仍需用户自行审核。</p>
      </article>
      <article>
        <h3>扣费规则是什么？</h3>
        <p>中文按 1 元/千字计费，英文按 2 元/千字计费；降AI+降重按基础单价 1.8 元/千字计算。低于 1000 字按实际字符数比例折算，失败订单不应扣费。</p>
      </article>
      <article>
        <h3>文件会保存多久？</h3>
        <p>当前版本主要保存提取文本、订单和处理结果。正式上线前建议增加文件过期删除、日志脱敏和用户删除申请流程。</p>
      </article>
    `,
  },
  contact: {
    title: "联系客服",
    subtitle: "订单、退款、人工精修和授权问题都可以联系运营人员。",
    html: `
      <div class="help-grid">
        <article><strong>客服邮箱</strong><span>service@daisy-aigc.local</span></article>
        <article><strong>工作时间</strong><span>工作日 09:30-18:30</span></article>
        <article><strong>咨询订单</strong><span>请提供订单号和账号邮箱</span></article>
      </div>
      <p>正式上线前请替换为真实企业邮箱、客服电话、企业微信或工单系统入口。</p>
      <a class="help-link" href="./contact.html">查看完整联系信息</a>
    `,
  },
  api: {
    title: "API 服务",
    subtitle: "为第三方网站或批量处理系统提供 API Key 接入。",
    html: `
      <div class="api-key-panel" id="apiKeyPanel">
        <div class="api-key-head">
          <div>
            <h3>API Key</h3>
            <p>密钥只在创建时显示一次，请妥善保存。调用会扣除所属账号余额。</p>
          </div>
          <button id="createApiKeyBtn">创建密钥</button>
        </div>
        <div id="apiKeyGenerated" class="api-key-generated" hidden></div>
        <div id="apiKeyList" class="api-key-list">正在读取...</div>
      </div>
      <article>
        <h3>处理接口</h3>
        <p><code>POST /api/optimize</code>，请求头 <code>Authorization: Bearer daisy_live_xxx</code>，参数包含 <code>service</code>、<code>platform</code>、<code>language</code>、<code>text</code>。</p>
      </article>
      <article>
        <h3>接入建议</h3>
        <p>正式开放 API 前，应继续增加限流、调用日志、异常告警和 IP 风控。</p>
      </article>
      <article>
        <h3>上游授权</h3>
        <p>AIGC 优化如果依赖 BypassAIGC，必须先取得商业授权，或替换为自研可商用实现。</p>
      </article>
    `,
  },
};

function openHelpModal(kind = "faq") {
  const section = helpSections[kind] || helpSections.faq;
  helpTitle.textContent = section.title;
  helpSubtitle.textContent = section.subtitle;
  helpContent.innerHTML = section.html;
  if (kind === "contact") {
    helpContent.insertAdjacentHTML("beforeend", `
      <form class="support-ticket-form" id="supportTicketForm">
        <label>
          <span>联系邮箱</span>
          <input id="ticketEmail" type="email" value="${escapeHtml(state.email || "")}" placeholder="you@example.com" />
        </label>
        <label>
          <span>问题类型</span>
          <select id="ticketCategory">
            <option value="payment">充值/支付</option>
            <option value="order">订单/处理结果</option>
            <option value="refund">退款/余额</option>
            <option value="account">账号/API</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label>
          <span>问题标题</span>
          <input id="ticketSubject" type="text" maxlength="80" placeholder="例如：支付已完成但余额未到账" />
        </label>
        <label>
          <span>关联单号</span>
          <input id="ticketRefId" type="text" maxlength="80" placeholder="可填订单号、支付单号或 API Key 前缀" />
        </label>
        <label>
          <span>问题描述</span>
          <textarea id="ticketMessage" maxlength="1000" placeholder="请说明发生时间、检测平台、支付交易号或你希望客服处理的事项"></textarea>
        </label>
        <button class="auth-submit" id="submitTicketBtn" type="submit">提交工单</button>
      </form>
      <div class="support-ticket-list" id="supportTicketList"></div>
    `);
    loadSupportTickets({ quiet: true });
  }
  helpModal.hidden = false;
  if (kind === "api") {
    state.generatedApiKey = "";
    loadApiKeys();
  }
}

function closeHelpModal() {
  helpModal.hidden = true;
}

function ticketStatusLabel(status) {
  return ({
    open: "待处理",
    processing: "处理中",
    resolved: "已解决",
    closed: "已关闭",
  })[status] || status || "-";
}

function renderSupportTickets(tickets = []) {
  const list = document.querySelector("#supportTicketList");
  if (!list) return;
  if (!state.authenticated) {
    list.innerHTML = '<div class="empty-orders">登录后可查看你提交过的工单。</div>';
    return;
  }
  list.innerHTML = tickets.length
    ? tickets.map((ticket) => `
        <div class="support-ticket-row">
          <span>
            <strong>${escapeHtml(ticket.subject)}</strong>
            <small>${escapeHtml(ticket.ticket_id)} · ${escapeHtml(ticket.category)} · ${escapeHtml(ticketStatusLabel(ticket.status))}</small>
            <small>${escapeHtml(formatTime(ticket.created_at))}${ticket.ref_id ? ` · 关联 ${escapeHtml(ticket.ref_id)}` : ""}</small>
            ${ticket.admin_note ? `<small>客服备注：${escapeHtml(ticket.admin_note)}</small>` : ""}
          </span>
        </div>
      `).join("")
    : '<div class="empty-orders">暂无工单记录</div>';
}

async function loadSupportTickets({ quiet = false } = {}) {
  const list = document.querySelector("#supportTicketList");
  if (!list) return;
  list.innerHTML = '<div class="empty-orders">正在读取工单...</div>';
  try {
    const response = await authFetch("/api/support-tickets");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "工单读取失败");
    renderSupportTickets(payload.tickets || []);
  } catch (error) {
    list.innerHTML = '<div class="empty-orders">工单读取失败</div>';
    if (!quiet) showToast(error.message);
  }
}

async function submitSupportTicket(form) {
  const submitButton = form.querySelector("#submitTicketBtn");
  submitButton.disabled = true;
  submitButton.textContent = "提交中...";
  try {
    const response = await authFetch("/api/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.querySelector("#ticketEmail").value.trim(),
        category: form.querySelector("#ticketCategory").value,
        subject: form.querySelector("#ticketSubject").value.trim(),
        ref_id: form.querySelector("#ticketRefId").value.trim(),
        message: form.querySelector("#ticketMessage").value.trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "工单提交失败");
    form.querySelector("#ticketSubject").value = "";
    form.querySelector("#ticketRefId").value = "";
    form.querySelector("#ticketMessage").value = "";
    showToast(`工单 ${payload.ticket_id} 已提交`);
    await loadSupportTickets({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "提交工单";
  }
}

function renderApiKeys(keys = []) {
  const list = document.querySelector("#apiKeyList");
  if (!list) return;
  list.innerHTML = keys.length
    ? keys.map((key) => `
        <div class="api-key-row">
          <span>
            <strong>${escapeHtml(key.name)}</strong>
            <small>${escapeHtml(key.key_prefix)}... · ${escapeHtml(key.status)} · 创建于 ${escapeHtml(formatTime(key.created_at))}</small>
          </span>
          <button data-revoke-api-key="${escapeHtml(key.id)}">撤销</button>
        </div>
      `).join("")
    : '<div class="empty-orders">暂无 API Key</div>';
}

async function loadApiKeys() {
  const list = document.querySelector("#apiKeyList");
  if (!list) return;
  if (!state.authenticated) {
    list.innerHTML = '<div class="empty-orders">请先登录后管理 API Key</div>';
    return;
  }
  try {
    const response = await authFetch("/api/api-keys");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "API Key 读取失败");
    renderApiKeys(payload.keys || []);
  } catch (error) {
    list.innerHTML = '<div class="empty-orders">API Key 读取失败</div>';
    showToast(error.message);
  }
}

async function createApiKey() {
  if (!state.authenticated) {
    openAuthModal("login");
    return;
  }
  try {
    const response = await authFetch("/api/api-keys/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `网页接入 ${new Date().toLocaleDateString("zh-CN")}` }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "API Key 创建失败");
    state.generatedApiKey = payload.key;
    const target = document.querySelector("#apiKeyGenerated");
    target.hidden = false;
    target.innerHTML = `
      <span>新密钥只显示一次</span>
      <code>${escapeHtml(payload.key)}</code>
      <button data-copy-generated-key>复制</button>
    `;
    await loadApiKeys();
  } catch (error) {
    showToast(error.message);
  }
}

async function revokeApiKey(keyId) {
  try {
    const response = await authFetch("/api/api-keys/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: keyId }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "API Key 撤销失败");
    showToast("API Key 已撤销");
    await loadApiKeys();
  } catch (error) {
    showToast(error.message);
  }
}

document.querySelectorAll("[data-help-trigger]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openHelpModal(trigger.dataset.helpTrigger);
  });
});
helpClose.addEventListener("click", closeHelpModal);
helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) closeHelpModal();
  const createButton = event.target.closest("#createApiKeyBtn");
  if (createButton) createApiKey();
  const revokeButton = event.target.closest("[data-revoke-api-key]");
  if (revokeButton) revokeApiKey(revokeButton.dataset.revokeApiKey);
  const copyButton = event.target.closest("[data-copy-generated-key]");
  if (copyButton && state.generatedApiKey) {
    navigator.clipboard.writeText(state.generatedApiKey);
    showToast("API Key 已复制");
  }
});
helpModal.addEventListener("submit", (event) => {
  const form = event.target.closest("#supportTicketForm");
  if (!form) return;
  event.preventDefault();
  submitSupportTicket(form);
});

createIconsSafe();
updateInputMode();
updatePrice();
refreshPublicConfig();
refreshAccount();
