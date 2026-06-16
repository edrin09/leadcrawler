const nodemailer = require('nodemailer');
const path = require('path');

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;
  const host = process.env.NOTIFY_EMAIL_HOST;
  const port = parseInt(process.env.NOTIFY_EMAIL_PORT || '465', 10);
  const user = process.env.NOTIFY_EMAIL_USER;
  const pass = process.env.NOTIFY_EMAIL_PASS;
  if (!host || !user || !pass) {
    console.log('[通知] 邮件未配置，跳过邮件通知');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

async function sendVerificationNotification(request) {
  try {
    const t = initTransporter();
    if (!t) return;
    const to = process.env.NOTIFY_EMAIL_TO || process.env.NOTIFY_EMAIL_USER;
    if (!to) return;
    const serverUrl = process.env.REMOTE_SERVER_URL || `http://localhost:${process.env.REMOTE_SERVER_PORT || 3456}`;
    const verifyLink = `${serverUrl}/verify.html?id=${request.id}`;
    await t.sendMail({
      from: process.env.NOTIFY_EMAIL_USER,
      to,
      subject: `[采集系统] 需要人工验证 - ${request.crawler} - ${request.typeLabel}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#e65100">需要人工验证</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">来源</td><td style="padding:8px">${request.crawler}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">类型</td><td style="padding:8px">${request.typeLabel}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">描述</td><td style="padding:8px">${request.description || '无'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">超时</td><td style="padding:8px">${Math.round(request.timeout / 60000)} 分钟</td></tr>
          <tr><td style="padding:8px;font-weight:bold">时间</td><td style="padding:8px">${new Date(request.timestamp).toLocaleString('zh-CN')}</td></tr>
        </table>
        <a href="${verifyLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#e65100;color:#fff;text-decoration:none;border-radius:4px">前往处理</a>
        <p style="color:#999;font-size:12px;margin-top:16px">此邮件由采集系统自动发送</p>
      </div>`,
    });
    console.log(`[通知] 邮件已发送至 ${to}`);
  } catch (e) {
    console.log(`[通知] 邮件发送失败: ${e.message}`);
  }
}

module.exports = { sendVerificationNotification };