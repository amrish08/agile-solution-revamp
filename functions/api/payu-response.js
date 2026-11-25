const enc = new TextEncoder();
async function sha512(value) {
  const digest = await crypto.subtle.digest("SHA-512", enc.encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a, b) {
  a = String(a).toLowerCase(); b = String(b).toLowerCase();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function result(title, message, success = false) {
  const color = success ? "#087f5b" : "#b42318";
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Agile Solution</title><body style="font:16px Arial;background:#f5f7fb;padding:30px"><main style="max-width:620px;margin:8vh auto;background:#fff;padding:32px;border-radius:16px"><div style="font-size:13px;color:#667085">AGILE SOLUTION</div><h1 style="color:${color}">${esc(title)}</h1><p>${esc(message)}</p><p><a href="/">Return to website</a></p><p style="color:#667085;font-size:13px">Help: +91 88259 85850 · agilesolution2026@gmail.com</p></main></body>`, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
export async function onRequestPost({ request, env }) {
  if (!env.PAYU_KEY || !env.PAYU_SALT || !env.DB)
    return result("Payment verification unavailable", "The payment service is not configured. Contact Agile Solution.");
  const p = Object.fromEntries(await request.formData());
  const required = ["status", "txnid", "amount", "productinfo", "firstname", "email", "key", "hash"];
  if (required.some(k => p[k] === undefined))
    return result("Unable to verify payment", "The payment response was incomplete. Contact Agile Solution.");
  const reverse = `${env.PAYU_SALT}|${p.status}||||||${p.udf5 || ""}|${p.udf4 || ""}|${p.udf3 || ""}|${p.udf2 || ""}|${p.udf1 || ""}|${p.email}|${p.firstname}|${p.productinfo}|${p.amount}|${p.txnid}|${p.key}`;
  const expected = await sha512(reverse);
  if (!safeEqual(expected, p.hash) || !safeEqual(env.PAYU_KEY, p.key))
    return result("Payment verification failed", "The payment response could not be verified. Do not pay again yet; contact Agile Solution with your transaction reference.");
  const order = await env.DB.prepare("SELECT * FROM orders WHERE txnid = ?").bind(String(p.txnid)).first();
  if (!order) return result("Order not found", `No matching order was found for transaction ${p.txnid}. Contact Agile Solution.`);
  if (String(order.amount) !== String(p.amount) || String(order.productinfo) !== String(p.productinfo))
    return result("Order details mismatch", "Please contact Agile Solution before making another payment.");
  const success = String(p.status).toLowerCase() === "success";
  await env.DB.prepare("UPDATE orders SET status = ?, mihpayid = ?, payu_status = ?, updated_at = datetime('now') WHERE txnid = ?")
    .bind(success ? "success" : "failed", String(p.mihpayid || ""), String(p.status), String(p.txnid)).run();
  return success
    ? result("Payment successful", `Your payment was verified. Transaction ID: ${p.txnid}. Agile Solution will contact you to confirm your service booking.`, true)
    : result("Payment not completed", `PayU reported that this payment was not successful. Transaction ID: ${p.txnid}. Contact Agile Solution if you need help.`);
}
