const TOKEN_KEY = "prismxToken";

function readToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

function writeToken(token, remember) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

function publicSite() {
  const host = location.hostname;
  return host === "prismxvisuals.com" || host === "www.prismxvisuals.com" || host.endsWith(".github.io");
}

function apiBase() {
  if (!publicSite()) return "";
  return "https://constitutional-jane-tiffany-shower.trycloudflare.com";
}

function safeNext() {
  const next = new URLSearchParams(location.search).get("next") || "";
  if (/^(index\.html|checkout\.html|account\.html)(\?[A-Za-z0-9=&%._-]*)?$/.test(next)) return next;
  return "";
}

async function accountCall(path, payload) {
  const headers = { Accept: "application/json" };
  const token = readToken();
  if (token) headers.Authorization = "Bearer " + token;
  const options = { headers };
  if (payload) {
    headers["Content-Type"] = "application/json";
    options.method = "POST";
    options.body = JSON.stringify(payload);
  }
  try {
    const response = await fetch(apiBase() + path, options);
    const body = await response.json();
    if (response.status === 401) {
      writeToken("", false);
      return { ok: true, signedIn: false, licensed: false, username: "", message: "" };
    }
    return body;
  } catch (error) {
    return { ok: false, signedIn: false, message: "The account server is not running." };
  }
}

function setNote(note, text, bad) {
  if (!note) return;
  note.textContent = text || "";
  note.classList.toggle("bad", Boolean(bad));
}

async function paintNav() {
  const signIn = document.getElementById("navSignIn");
  const signUp = document.getElementById("navSignUp");
  if (!signIn || !signUp) return;
  const session = await accountCall("/api/session");
  if (!session.signedIn) return;
  signIn.textContent = session.username;
  signIn.href = "account.html";
  signUp.textContent = "Sign out";
  signUp.href = "#signout";
  signUp.addEventListener("click", async (event) => {
    event.preventDefault();
    await accountCall("/api/signout", {});
    writeToken("", false);
    location.href = "index.html";
  });
}

function bindSignIn() {
  const form = document.getElementById("signInForm");
  if (!form) return;
  const next = safeNext();
  const signUp = document.getElementById("goSignUp");
  if (signUp && next) signUp.href = "signup.html?next=" + encodeURIComponent(next);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("formNote");
    setNote(note, "Signing in");
    const data = new FormData(form);
    const result = await accountCall("/api/signin", {
      username: data.get("username"),
      password: data.get("password"),
      remember: data.get("remember") === "on",
    });
    if (!result.ok || !result.token) {
      setNote(note, result.message || "That username or password is wrong.", true);
      return;
    }
    writeToken(result.token, data.get("remember") === "on");
    location.href = next || "index.html";
  });
}

function bindSignUp() {
  const form = document.getElementById("signUpForm");
  if (!form) return;
  const next = safeNext();
  const signIn = document.getElementById("goSignIn");
  if (signIn && next) signIn.href = "signin.html?next=" + encodeURIComponent(next);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("formNote");
    const data = new FormData(form);
    if (data.get("password") !== data.get("confirm")) {
      setNote(note, "Those passwords do not match.", true);
      return;
    }
    setNote(note, "Creating the account");
    const result = await accountCall("/api/signup", {
      username: data.get("username"),
      password: data.get("password"),
    });
    if (!result.ok || !result.token) {
      setNote(note, result.message || "The account could not be created.", true);
      return;
    }
    writeToken(result.token, false);
    location.href = next || "checkout.html?plan=lifetime";
  });
}

function bindCheckout() {
  const form = document.getElementById("checkoutForm");
  if (!form) return;
  const params = new URLSearchParams(location.search);
  const offers = {
    week: { name: "Week", title: "PRISMX WEEK KEY", price: "$5", term: "7 days" },
    month: { name: "Month", title: "PRISMX MONTH KEY", price: "$10", term: "30 days" },
    lifetime: { name: "Lifetime", title: "PRISMX LIFETIME KEY", price: "$20", term: "Lifetime" },
  };
  const plan = offers[params.get("plan")] ? params.get("plan") : "lifetime";
  const offer = offers[plan];
  document.querySelectorAll("[data-plan]").forEach((node) => {
    const field = node.dataset.plan;
    if (offer[field]) node.textContent = offer[field];
  });
  const next = "checkout.html?plan=" + plan;
  const supportUrl = "https://discord.gg/NBnqkH2PTA";
  const methods = form.querySelectorAll(".method");
  const payButton = document.getElementById("payButton");
  function chosenMethod() {
    const picked = form.querySelector(".method.on");
    return picked ? picked.dataset.method : "Stripe";
  }
  function manualMethod(name) {
    return name === "PayPal" || name === "Cash App";
  }
  methods.forEach((method) => {
    method.addEventListener("click", () => {
      methods.forEach((item) => item.classList.toggle("on", item === method));
      const name = method.dataset.method;
      payButton.textContent = manualMethod(name) ? "Continue in Discord" : "Continue with " + name;
      setNote(
        document.getElementById("formNote"),
        manualMethod(name) ? "PayPal and Cash App are finished in Discord support." : ""
      );
    });
  });
  let appliedPromo = "";
  document.getElementById("promoApply").addEventListener("click", async () => {
    const code = document.getElementById("promoCode").value.trim();
    const note = document.getElementById("promoNote");
    if (!code) {
      appliedPromo = "";
      setNote(note, "Enter a promo code.", true);
      return;
    }
    const result = await accountCall("/api/promo", { code, plan });
    if (!result.ok) {
      appliedPromo = "";
      setNote(note, result.message || "That code is not active.", true);
      return;
    }
    appliedPromo = code;
    setNote(note, result.message || "Code applied.");
  });
  const stripeSession = params.get("session_id");
  accountCall("/api/session").then(async (session) => {
    if (!session.signedIn) {
      location.replace("signin.html?next=" + encodeURIComponent(next));
      return;
    }
    if (session.email) form.email.value = session.email;
    if (session.username) document.getElementById("contactName").value = session.username;
    const note = document.getElementById("formNote");
    if (params.get("canceled") === "1") {
      setNote(note, "Stripe checkout was closed. No charge was made.", true);
    }
    if (stripeSession) {
      setNote(note, "Checking the Stripe payment");
      const paid = await accountCall("/api/stripe/confirm", { sessionId: stripeSession });
      if (paid.signedIn === false) {
        location.replace("signin.html?next=" + encodeURIComponent(next));
        return;
      }
      if (!paid.ok || !paid.key) {
        setNote(note, paid.message || "The payment could not be confirmed.", true);
        return;
      }
      showDelivery(paid.key, paid.message || "Paste this key into Prismx.", paid.order, paid.customerNumber);
      return;
    }
    if (session.pendingKey && session.pendingPlan === plan) {
      showDelivery(session.pendingKey, "", session.billing && session.billing.orderNumber, session.customerNumber);
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("formNote");
    if (!document.getElementById("acceptTerms").checked) {
      setNote(note, "Accept the terms to continue.", true);
      return;
    }
    if (manualMethod(chosenMethod())) {
      const alert = document.getElementById("manualAlert");
      const name = chosenMethod();
      document.getElementById("manualMethod").textContent = name;
      document.getElementById("manualCopy").textContent = name + " is not charged on this page. Join Discord support and someone will finish the order with you.";
      alert.hidden = false;
      window.requestAnimationFrame(() => alert.classList.add("show"));
      document.getElementById("joinDiscord").focus();
      return;
    }
    const method = chosenMethod();
    if (method === "Stripe") {
      setNote(note, "Opening Stripe");
      const result = await accountCall("/api/checkout", {
        email: new FormData(form).get("email"),
        plan,
        method: "Stripe",
        promo: appliedPromo,
      });
      if (result.signedIn === false) {
        location.replace("signin.html?next=" + encodeURIComponent(next));
        return;
      }
      if (result.ok && result.key) {
        showDelivery(result.key, result.message || "Paste this key into Prismx.", result.order, result.customerNumber);
        return;
      }
      if (!result.ok || !result.url) {
        setNote(note, result.message || "Stripe could not open.", true);
        return;
      }
      location.href = result.url;
      return;
    }
    setNote(note, "Saving the email");
    const result = await accountCall("/api/checkout", {
      email: new FormData(form).get("email"),
      plan,
    });
    if (result.signedIn === false) {
      location.replace("signin.html?next=" + encodeURIComponent(next));
      return;
    }
    if (!result.ok || !result.key) {
      setNote(note, result.message || "The key could not be created.", true);
      return;
    }
    showDelivery(result.key, result.message || "Paste this key into Prismx.", result.order, result.customerNumber);
  });
  const manualAlert = document.getElementById("manualAlert");
  function closeManual() {
    manualAlert.classList.remove("show");
    window.setTimeout(() => {
      if (!manualAlert.classList.contains("show")) manualAlert.hidden = true;
    }, 420);
    payButton.focus();
  }
  document.getElementById("changeMethod").addEventListener("click", closeManual);
  manualAlert.addEventListener("click", (event) => {
    if (event.target === manualAlert) closeManual();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && manualAlert.classList.contains("show")) closeManual();
  });
}

function showDelivery(code, message, order, customer) {
  const form = document.getElementById("checkoutForm");
  const panel = document.getElementById("deliveryPanel");
  if (form) form.hidden = true;
  if (panel) panel.hidden = false;
  document.querySelectorAll(".steps li").forEach((item, index) => {
    item.classList.toggle("done", index < 2);
    item.classList.toggle("on", index === 2);
  });
  const customerBox = document.getElementById("customerBox");
  const orderBox = document.getElementById("orderBox");
  if (customerBox) {
    customerBox.hidden = !customer;
    customerBox.textContent = customer ? "Customer " + customer : "";
  }
  if (orderBox) {
    orderBox.hidden = !order;
    orderBox.textContent = order ? "Order " + order : "";
  }
  showKey(code);
  const copy = panel ? panel.querySelector("header p") : null;
  if (copy && message) copy.textContent = message;
}

function bindAccount() {
  const page = document.getElementById("accountPage");
  if (!page) return;
  const note = document.getElementById("formNote");
  const history = document.getElementById("billHistory");
  const renew = document.getElementById("renewBtn");
  const cancel = document.getElementById("cancelBtn");
  const fresh = document.getElementById("newKeyLink");

  function paint(session) {
    const bill = session.billing || {};
    document.getElementById("billPlan").textContent = bill.planLabel || "No plan";
    document.getElementById("billStatus").textContent = bill.statusLabel || "No key yet";
    document.getElementById("billEmail").textContent = session.email || "Added at checkout";
    document.getElementById("billCustomer").textContent = session.customerNumber || "Assigned when the account is created";
    document.getElementById("billOrder").textContent = bill.orderNumber || "Shown after checkout";
    coverKey(document.getElementById("billKey"), document.getElementById("billKeyEye"), bill.key || "");
    document.getElementById("billDate").textContent = bill.periodLabel || "Choose a plan to get a key.";
    renew.hidden = !(bill.kind === "subscription" && (bill.status === "active" || bill.status === "past_due"));
    cancel.hidden = bill.status !== "active" || bill.kind !== "subscription";
    fresh.hidden = bill.status !== "ended" && bill.status !== "none" && bill.status !== "retired";
    if (bill.status === "none") fresh.hidden = false;
    history.replaceChildren();
    const rows = bill.history || [];
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.textContent = "No billing yet.";
      history.appendChild(empty);
      return;
    }
    rows.forEach((item) => {
      const row = document.createElement("li");
      const when = document.createElement("time");
      when.dateTime = new Date(item.at * 1000).toISOString();
      when.textContent = new Date(item.at * 1000).toLocaleString();
      row.appendChild(when);
      row.appendChild(document.createTextNode(item.detail));
      history.appendChild(row);
    });
  }

  accountCall("/api/session").then((session) => {
    if (!session.signedIn) {
      location.replace("signin.html?next=" + encodeURIComponent("account.html"));
      return;
    }
    paint(session);
    if (session.message) setNote(note, session.message, session.billing && session.billing.status === "past_due");
  });

  renew.addEventListener("click", async () => {
    setNote(note, "Renewing");
    const result = await accountCall("/api/renew", {});
    if (!result.ok) {
      setNote(note, result.message || "The renewal did not go through.", true);
      return;
    }
    paint(result);
    setNote(note, result.message || "Renewed.");
  });

  cancel.addEventListener("click", async () => {
    if (!window.confirm("Cancel this subscription? The key keeps working until the time you already paid for ends, then you need a new key.")) return;
    setNote(note, "Cancelling");
    const result = await accountCall("/api/cancel", {});
    if (!result.ok) {
      setNote(note, result.message || "The subscription could not be cancelled.", true);
      return;
    }
    paint(result);
    setNote(note, result.message || "Cancelled.");
  });
}

function maskKey(value) {
  return value.replace(/[A-Za-z0-9]/g, "•");
}

function coverKey(node, eye, value) {
  if (!node) return;
  const secret = value || "";
  node.dataset.secret = secret;
  node.dataset.shown = "0";
  if (eye) {
    eye.hidden = !secret;
    eye.classList.remove("open");
    eye.setAttribute("aria-label", "Show key");
    eye.setAttribute("aria-pressed", "false");
  }
  node.textContent = secret ? maskKey(secret) : "None yet";
}

function toggleKey(node, eye) {
  if (!node || !node.dataset.secret) return;
  const shown = node.dataset.shown === "1";
  node.dataset.shown = shown ? "0" : "1";
  node.textContent = shown ? maskKey(node.dataset.secret) : node.dataset.secret;
  if (!eye) return;
  eye.classList.toggle("open", !shown);
  eye.setAttribute("aria-pressed", shown ? "false" : "true");
  eye.setAttribute("aria-label", shown ? "Show key" : "Hide key");
}

function showKey(code) {
  const wrap = document.getElementById("keyWrap");
  const box = document.getElementById("keyBox");
  if (wrap) wrap.hidden = false;
  coverKey(box, document.getElementById("keyEye"), code || "");
}

const billEye = document.getElementById("billKeyEye");
if (billEye) billEye.addEventListener("click", () => toggleKey(document.getElementById("billKey"), billEye));
const checkoutEye = document.getElementById("keyEye");
if (checkoutEye) checkoutEye.addEventListener("click", () => toggleKey(document.getElementById("keyBox"), checkoutEye));

paintNav();
bindSignIn();
bindSignUp();
bindCheckout();
bindAccount();
