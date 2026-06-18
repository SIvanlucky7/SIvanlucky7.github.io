const toast = document.querySelector("#toast");
const loginPanel = document.querySelector("#adminLoginPanel");
const adminContent = document.querySelector("#adminContent");
const loginForm = document.querySelector("#adminLoginForm");
const loginButton = document.querySelector("#adminLoginBtn");
const adjustForm = document.querySelector("#adjustForm");
const adjustSubmit = document.querySelector("#adjustSubmit");
const adjustEmail = document.querySelector("#adjustEmail");
const adjustAmount = document.querySelector("#adjustAmount");
const adjustNote = document.querySelector("#adjustNote");
const confirmPaymentForm = document.querySelector("#confirmPaymentForm");
const confirmPaymentSubmit = document.querySelector("#confirmPaymentSubmit");
const confirmPaymentId = document.querySelector("#confirmPaymentId");
const confirmTradeNo = document.querySelector("#confirmTradeNo");
const confirmPaymentNote = document.querySelector("#confirmPaymentNote");
const cleanupResultsBtn = document.querySelector("#cleanupResultsBtn");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function money(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function time(value) {
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString("zh-CN", { hour12: false });
}

function cell(value) {
  return String(value ?? "-").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function attr(value) {
  return cell(value).replace(/`/g, "&#96;");
}

function claimedAmountText(row) {
  if (row.user_claimed_amount == null) return "-";
  const text = money(row.user_claimed_amount);
  return row.amount_mismatch ? `${text}（不一致）` : text;
}

function paymentProofText(row) {
  return row.user_trade_no || row.user_payment_note || row.cancel_note || "-";
}

function paymentActions(row) {
  if (row.status !== "pending") return "-";
  const noteParts = [];
  if (row.user_claimed_amount != null) noteParts.push(`用户填报${money(row.user_claimed_amount)}`);
  if (row.amount_mismatch) noteParts.push("金额不一致，需驳回重填");
  if (row.user_payment_note) noteParts.push(row.user_payment_note);
  const defaultNote = noteParts.join("；");
  return `
    <button class="table-action" data-confirm-payment="${attr(row.payment_id)}" data-user-trade-no="${attr(row.user_trade_no || "")}" data-user-note="${attr(defaultNote || row.user_payment_note || "")}">入账</button>
    <button class="table-action danger-action" data-cancel-payment="${attr(row.payment_id)}" data-user-note="${attr(defaultNote || row.user_payment_note || "")}">驳回</button>
  `;
}

function ticketActions(row) {
  if (row.status === "closed" || row.status === "resolved") return "-";
  return `
    <button class="table-action" data-ticket-status="processing" data-ticket-id="${attr(row.ticket_id)}">处理中</button>
    <button class="table-action" data-ticket-status="resolved" data-ticket-id="${attr(row.ticket_id)}">解决</button>
  `;
}

function renderRows(target, rows, mapper, colspan) {
  target.innerHTML = rows.length
    ? rows.map((row) => `<tr>${mapper(row).map((item) => `<td>${cell(item)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${colspan}">暂无数据</td></tr>`;
}

function renderReadiness(readiness) {
  const status = document.querySelector("#readinessStatus");
  const grid = document.querySelector("#readinessGrid");
  if (!readiness) {
    status.textContent = "未读取";
    grid.innerHTML = "";
    return;
  }
  status.textContent = readiness.production_ready
    ? "可进入生产前复核"
    : `${readiness.blockers} 个阻塞项 / ${readiness.warnings} 个建议项`;
  status.className = readiness.production_ready ? "ready" : "blocked";
  grid.innerHTML = readiness.checks.map((item) => `
    <article class="readiness-item ${cell(item.severity)}">
      <span>${item.ok ? "通过" : item.severity === "blocker" ? "阻塞" : "建议"}</span>
      <strong>${cell(item.title)}</strong>
      <p>${cell(item.detail)}</p>
    </article>
  `).join("");
}

function renderUsers(rows) {
  const target = document.querySelector("#usersBody");
  target.innerHTML = rows.length
    ? rows.map((row) => `
        <tr>
          <td>${cell(row.email)}</td>
          <td>${cell(money(row.balance))}</td>
          <td>${cell(time(row.created_at))}</td>
          <td><button class="table-action" data-adjust-email="${attr(row.email)}">调整</button></td>
        </tr>
      `).join("")
    : '<tr><td colspan="4">暂无数据</td></tr>';
}

function renderPayments(rows) {
  const target = document.querySelector("#paymentsBody");
  target.innerHTML = rows.length
    ? rows.map((row) => `
        <tr>
          <td>${cell(row.payment_id)}</td>
          <td>${cell(money(row.amount))}</td>
          <td>${cell(claimedAmountText(row))}</td>
          <td>${cell(row.status)}</td>
          <td>${cell(paymentProofText(row))}</td>
          <td>${cell(row.provider_trade_no || "-")}</td>
          <td>${paymentActions(row)}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="7">暂无数据</td></tr>';
}

function renderSupportTickets(rows) {
  const target = document.querySelector("#supportTicketsBody");
  target.innerHTML = rows.length
    ? rows.map((row) => `
        <tr>
          <td>${cell(row.ticket_id)}</td>
          <td>${cell(row.email)}</td>
          <td>${cell(row.category)}</td>
          <td>${cell(row.subject)}</td>
          <td>${cell(row.status)}</td>
          <td>${cell(row.ref_id || "-")}</td>
          <td>${cell(row.admin_note || "-")}</td>
          <td>${ticketActions(row)}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="8">暂无数据</td></tr>';
}

function showLogin(message) {
  loginPanel.hidden = false;
  adminContent.hidden = true;
  document.querySelector("#adminUpdated").textContent = "需要管理员登录";
  if (message) showToast(message);
}

function showDashboard() {
  loginPanel.hidden = true;
  adminContent.hidden = false;
}

function renderAdmin(payload) {
  showDashboard();
  document.querySelector("#metricUsers").textContent = payload.stats.users;
  document.querySelector("#metricOrders").textContent = payload.stats.orders;
  document.querySelector("#metricRevenue").textContent = money(payload.stats.revenue);
  document.querySelector("#metricApiCalls").textContent = payload.stats.api_calls_24h || 0;
  if (cleanupResultsBtn) {
    cleanupResultsBtn.textContent = `清理旧结果（${payload.stats.stored_results || 0}）`;
  }
  document.querySelector("#adminUpdated").textContent = `更新于 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`;
  renderReadiness(payload.readiness);

  renderUsers(payload.users);
  renderPayments(payload.payments);
  renderRows(document.querySelector("#ordersBody"), payload.orders, (row) => [
    row.order_id,
    row.service,
    row.chars,
    money(row.amount),
    row.engine,
    row.status,
  ], 6);
  renderRows(document.querySelector("#ledgerBody"), payload.ledger, (row) => [
    row.id,
    row.type,
    money(row.amount),
    money(row.balance_after),
    row.ref_id || "-",
    row.note || "-",
  ], 6);
  renderSupportTickets(payload.support_tickets || []);
  renderRows(document.querySelector("#adminAuditBody"), payload.admin_audit || [], (row) => [
    row.id,
    row.admin_email || row.admin_user_id || "-",
    row.action,
    row.target_email || row.target_user_id || "-",
    money(row.amount),
    row.ref_id || "-",
    row.ip || "-",
    row.note || "-",
  ], 8);
  renderRows(document.querySelector("#apiUsageBody"), payload.api_usage || [], (row) => [
    row.id,
    row.email,
    `${row.name || "-"} / ${row.key_prefix || "-"}`,
    row.status,
    row.chars,
    money(row.amount),
    row.order_id || "-",
    row.error || "-",
  ], 8);
}

async function loadAdmin({ quiet = false } = {}) {
  try {
    const response = await fetch("/api/admin/summary");
    const payload = await response.json();
    if (response.status === 401 || response.status === 403) {
      showLogin(payload.error || "请先登录管理员账号");
      return;
    }
    if (!response.ok) throw new Error(payload.error || "后台数据读取失败");
    renderAdmin(payload);
  } catch (error) {
    if (!quiet) showToast(error.message);
  }
}

async function initAdmin() {
  if (!window.DaisyAuth) {
    await new Promise((resolve) => {
      window.addEventListener("daisy-auth-ready", resolve, { once: true });
      setTimeout(resolve, 2500);
    });
  }
  try {
    const response = await fetch("/api/me");
    const payload = await response.json();
    if (!response.ok || !payload.authenticated) {
      showLogin();
      return;
    }
    await loadAdmin({ quiet: true });
  } catch (error) {
    showLogin();
  }
}

async function loginAdmin(event) {
  event.preventDefault();
  loginButton.disabled = true;
  loginButton.textContent = "登录中...";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#adminEmail").value,
        password: document.querySelector("#adminPassword").value,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "登录失败");
    await loadAdmin({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "进入后台";
  }
}

async function submitAdjustment(event) {
  event.preventDefault();
  adjustSubmit.disabled = true;
  adjustSubmit.textContent = "提交中...";
  try {
    const response = await fetch("/api/admin/adjust-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adjustEmail.value.trim(),
        amount: Number(adjustAmount.value),
        note: adjustNote.value.trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "余额调整失败");
    showToast(`${payload.email} 已调整 ${money(payload.amount)}，余额 ${money(payload.balance_after)}`);
    adjustAmount.value = "";
    adjustNote.value = "";
    await loadAdmin({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    adjustSubmit.disabled = false;
    adjustSubmit.textContent = "提交调整";
  }
}

async function submitPaymentConfirm(event) {
  event.preventDefault();
  confirmPaymentSubmit.disabled = true;
  confirmPaymentSubmit.textContent = "确认中...";
  try {
    const response = await fetch("/api/admin/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: confirmPaymentId.value.trim(),
        provider_trade_no: confirmTradeNo.value.trim(),
        note: confirmPaymentNote.value.trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "支付入账失败");
    showToast(`${payload.payment_id} 已入账 ${money(payload.amount)}`);
    confirmTradeNo.value = "";
    confirmPaymentNote.value = "";
    await loadAdmin({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    confirmPaymentSubmit.disabled = false;
    confirmPaymentSubmit.textContent = "确认入账";
  }
}

async function cancelPayment(paymentId, defaultNote = "") {
  const note = window.prompt("请输入驳回原因，用户会在充值记录中看到该状态。", defaultNote || "未收到对应款项");
  if (note === null) return;
  try {
    const response = await fetch("/api/admin/cancel-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: paymentId,
        note: note.trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "支付单驳回失败");
    showToast(`${payload.payment_id} 已驳回`);
    await loadAdmin({ quiet: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function updateTicketStatus(ticketId, status) {
  const defaultNote = status === "resolved" ? "已处理" : "正在处理";
  const note = window.prompt("请输入客服备注。", defaultNote);
  if (note === null) return;
  try {
    const response = await fetch("/api/admin/update-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: ticketId,
        status,
        note: note.trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "工单更新失败");
    showToast(`${payload.ticket_id} 已更新为 ${payload.status}`);
    await loadAdmin({ quiet: true });
  } catch (error) {
    showToast(error.message);
  }
}

async function cleanupStoredResults() {
  const ok = window.confirm("将按 DAISY_RESULT_RETENTION_DAYS 清理过期订单结果文本，订单、金额和流水会保留。确认执行？");
  if (!ok) return;
  cleanupResultsBtn.disabled = true;
  try {
    const response = await fetch("/api/admin/cleanup-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "结果清理失败");
    if (!payload.enabled) {
      showToast("未配置 DAISY_RESULT_RETENTION_DAYS，未执行清理");
    } else {
      showToast(`已清理 ${payload.deleted} 份超过 ${payload.retention_days} 天的结果`);
    }
    await loadAdmin({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    cleanupResultsBtn.disabled = false;
  }
}

renderPayments = function renderPaymentsForReview(rows) {
  const target = document.querySelector("#paymentsBody");
  target.innerHTML = rows.length
    ? rows.map((row) => `
        <tr>
          <td>${cell(row.payment_id)}</td>
          <td>${cell(row.email || row.user_id || "-")}</td>
          <td>${cell(money(row.amount))}</td>
          <td>${cell(claimedAmountText(row))}</td>
          <td>${cell(row.status)}</td>
          <td>${cell(paymentProofText(row))}</td>
          <td>${cell(row.notified_at ? time(row.notified_at) : "-")}</td>
          <td>${cell(row.provider_trade_no || "-")}</td>
          <td>${paymentActions(row)}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="9">暂无数据</td></tr>';
};

document.querySelector("#refreshAdmin").addEventListener("click", () => loadAdmin());
loginForm.addEventListener("submit", loginAdmin);
adjustForm.addEventListener("submit", submitAdjustment);
confirmPaymentForm.addEventListener("submit", submitPaymentConfirm);
if (cleanupResultsBtn) {
  cleanupResultsBtn.addEventListener("click", cleanupStoredResults);
}
document.querySelector("#usersBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-adjust-email]");
  if (!button) return;
  adjustEmail.value = button.dataset.adjustEmail;
  adjustAmount.focus();
});
document.querySelector("#paymentsBody").addEventListener("click", (event) => {
  const confirmButton = event.target.closest("[data-confirm-payment]");
  if (confirmButton) {
    confirmPaymentId.value = confirmButton.dataset.confirmPayment;
    confirmTradeNo.value = confirmButton.dataset.userTradeNo || "";
    if (confirmButton.dataset.userNote && !confirmPaymentNote.value.trim()) {
      confirmPaymentNote.value = confirmButton.dataset.userNote;
    }
    confirmTradeNo.focus();
    return;
  }
  const cancelButton = event.target.closest("[data-cancel-payment]");
  if (cancelButton) {
    cancelPayment(cancelButton.dataset.cancelPayment, cancelButton.dataset.userNote || "");
  }
});
document.querySelector("#supportTicketsBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-ticket-id]");
  if (!button) return;
  updateTicketStatus(button.dataset.ticketId, button.dataset.ticketStatus);
});
if (window.lucide) {
  lucide.createIcons();
}
initAdmin();
