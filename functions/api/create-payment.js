const PRICES = {
  windows: { name: "Windows / software installation", amount: "499.00" },
  virus: { name: "Virus & malware cleanup", amount: "399.00" },
  printer: { name: "Printer / network setup", amount: "299.00" },
  diagnosis: { name: "Computer / laptop diagnosis", amount: "199.00" }
};

const enc = new TextEncoder();
async function sha512(value) {
  const digest = await crypto.subtle.digest("SHA-512", enc.encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function page(title, message, extra = "") {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><body style="font:16px Arial;background:#f5f7fb;padding:30px"><main style="max-width:620px;margin:8vh auto;background:white;padding:30px;border-radius:16px"><h1>${esc(title)}</h1><p>${esc(message)}</p>${extra}<p><a href="/">Return to Agile Solution</a></p></main></body>`, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
export async function onRequestPost({ request, env }) {
  if (!env.PAYU_KEY || !env.PAYU_SALT || !env.SITE_URL || !env.DB) {
    return page("Setup required", "PayU secrets, SITE_URL and the D1 database binding must be configured in Cloudflare before accepting payments.");
  }
  const form = await request.formData();
  const name = String(form.get("firstname") || "").trim();
  const phone = String(form.get("phone") || "").replace(/\D/g, "");
  const email = String(form.get("email") || "").trim();
  const device = String(form.get("device") || "").trim();
  const service = String(form.get("service") || "");
  const issue = String(form.get("issue") || "").trim().slice(0, 1000);
  if (!name || name.length > 60 || !/^[6-9]\d{9}$/.test(phone) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !device) {
    return page("Check your details", "Please provide a valid name, Indian mobile number, email and device type.");
  }
  if (service === "custom") {
    const message = `Hello Agile Solution, I need a service quote. Name: ${name}; Phone: ${phone}; Email: ${email}; Device: ${device}; Issue: ${issue}`;
    const link = "https://wa.me/918825985850?text=" + encodeURIComponent(message);
    return page("Enquiry ready", "No payment is collected for custom repairs until a quote is confirmed.",
      `<p><a style="display:inline-block;padding:13px 18px;background:#2457e6;color:white;border-radius:8px;text-decoration:none" href="${esc(link)}">Send enquiry on WhatsApp</a></p>`);
  }
  const item = PRICES[service];
  if (!item) return page("Choose a service", "Please select one of the available services.");
  const txnid = "AG" + new Date().toISOString().replace(/\D/g, "").slice(0, 14) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const amount = item.amount;
  const udf1 = device, udf2 = service, udf3 = "", udf4 = "", udf5 = "";
  const key = env.PAYU_KEY;
  const salt = env.PAYU_SALT;
  const productinfo = item.name;
  const hashInput = `${key}|${txnid}|${amount}|${productinfo}|${name}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  const hash = await sha512(hashInput);
  try {
    await env.DB.prepare(`INSERT INTO orders
      (txnid, amount, productinfo, firstname, email, phone, service, device, issue, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`)
      .bind(txnid, amount, productinfo, name, email, phone, service, device, issue).run();
  } catch (e) {
    return page("Order could not be saved", "Please try again later or contact Agile Solution. No payment has been initiated.");
  }
  const endpoint = env.PAYU_ENV === "production"
    ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";
  const params = {
    key, txnid, amount, productinfo, firstname: name, email, phone,
    surl: `${env.SITE_URL.replace(/\/$/, "")}/api/payu-response`,
    furl: `${env.SITE_URL.replace(/\/$/, "")}/api/payu-response`,
    hash, udf1, udf2, udf3, udf4, udf5
  };
  const fields = Object.entries(params).map(([k, v]) =>
    `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join("");
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirecting to PayU</title><body style="font:16px Arial;text-align:center;padding:12vh 20px"><h2>Redirecting to secure PayU checkout…</h2><p>Please do not close this page.</p><form id="payu" method="post" action="${endpoint}">${fields}<noscript><button>Continue to PayU</button></noscript></form><script>document.getElementById('payu').submit()</script></body>`, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
