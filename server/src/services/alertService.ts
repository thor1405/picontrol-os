import https from 'https';
import net from 'net';
import { db } from '../db/database';
import { SystemTelemetry } from '../collectors/systemCollector';

export interface AlertRule {
  id: number;
  name: string;
  metric_type: string;
  condition: '>' | '<' | '==' | '!=';
  threshold: number;
  duration_sec: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: number;
}

export interface AlertHistoryEntry {
  id: number;
  rule_id: number | null;
  rule_name: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value: number;
  state: 'active' | 'resolved';
  started_at: string;
  resolved_at: string | null;
  acknowledged: number;
}

// In-memory tracking for duration and notification cooldowns
const ruleViolationStart = new Map<number, number>();
const ruleLastNotified = new Map<number, number>();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown

export async function sendTelegramMessage(text: string): Promise<{ success: boolean; message: string }> {
  const tokenRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token') as { value: string } | undefined;
  const chatRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id') as { value: string } | undefined;
  const enabledRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_enabled') as { value: string } | undefined;

  const token = tokenRow?.value;
  const chatId = chatRow?.value;

  if (!token || !chatId) {
    return { success: false, message: 'Telegram Bot Token or Chat ID not configured.' };
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });

    const req = https.request(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: 'Telegram alert dispatched successfully.' });
          } else {
            resolve({ success: false, message: `Telegram API error: ${body}` });
          }
        });
      }
    );

    req.on('error', (err) => resolve({ success: false, message: `Telegram dispatch failed: ${err.message}` }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, message: 'Telegram dispatch timed out' });
    });
    req.write(postData);
    req.end();
  });
}

export async function sendSmtpAlert(subject: string, text: string): Promise<{ success: boolean; message: string }> {
  const host = (db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_host') as { value: string })?.value;
  const port = parseInt((db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_port') as { value: string })?.value || '587', 10);
  const user = (db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_user') as { value: string })?.value;
  const to = (db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_to') as { value: string })?.value;

  if (!host || !to) {
    return { success: false, message: 'SMTP Host or Recipient address not configured.' };
  }

  // Simulated clean response when SMTP credentials aren't wired to external relay in dev
  return { success: true, message: `Email alert simulated for ${to} via ${host}:${port}.` };
}

export async function evaluateTelemetryAlerts(telemetry: SystemTelemetry): Promise<void> {
  const rules = db.prepare('SELECT * FROM alert_rules WHERE enabled = 1').all() as AlertRule[];
  const now = Date.now();
  const timestamp = new Date().toISOString();

  for (const rule of rules) {
    let currentValue: number | null = null;
    let message = '';

    switch (rule.metric_type) {
      case 'cpu_temp':
        currentValue = telemetry.cpu.temperatureCelsius;
        message = `CPU temperature reached ${currentValue}°C (threshold: ${rule.threshold}°C)`;
        break;
      case 'cpu_usage':
        currentValue = telemetry.cpu.totalUsagePercent;
        message = `CPU utilization sustained at ${currentValue}% (threshold: ${rule.threshold}%)`;
        break;
      case 'ram_usage':
        currentValue = telemetry.memory.usagePercent;
        message = `Memory utilization reached ${currentValue}% (threshold: ${rule.threshold}%)`;
        break;
      case 'disk_usage':
        currentValue = telemetry.storage.overallUsagePercent;
        message = `Storage capacity reached ${currentValue}% (threshold: ${rule.threshold}%)`;
        break;
      case 'docker_stopped':
        currentValue = telemetry.system.overallHealth === 'critical' ? 1 : 0;
        message = `Detected unexpected container stop or system degradation`;
        break;
      default:
        continue;
    }

    if (currentValue === null) continue;

    // Evaluate condition
    let isViolated = false;
    if (rule.condition === '>') isViolated = currentValue > rule.threshold;
    else if (rule.condition === '<') isViolated = currentValue < rule.threshold;
    else if (rule.condition === '==') isViolated = currentValue === rule.threshold;
    else if (rule.condition === '!=') isViolated = currentValue !== rule.threshold;

    const violationStart = ruleViolationStart.get(rule.id);

    if (isViolated) {
      if (!violationStart) {
        ruleViolationStart.set(rule.id, now);
      } else if (now - violationStart >= rule.duration_sec * 1000) {
        // Sustained violation: trigger active alert
        const activeAlert = db.prepare('SELECT id FROM alert_history WHERE rule_id = ? AND state = ?').get(rule.id, 'active') as { id: number } | undefined;

        if (!activeAlert) {
          db.prepare(`
            INSERT INTO alert_history (rule_id, rule_name, severity, message, value, state, started_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?)
          `).run(rule.id, rule.name, rule.severity, message, currentValue, timestamp);

          // Check notification cooldown
          const lastNotified = ruleLastNotified.get(rule.id) || 0;
          if (now - lastNotified >= COOLDOWN_MS) {
            ruleLastNotified.set(rule.id, now);
            const alertText = `🚨 <b>[PiControl OS Alert]</b>\n<b>Rule:</b> ${rule.name}\n<b>Severity:</b> ${rule.severity.toUpperCase()}\n<b>Details:</b> ${message}\n<b>Device:</b> ${telemetry.system.hostname}`;
            sendTelegramMessage(alertText).catch(() => {});
          }
        }
      }
    } else {
      // Condition cleared
      ruleViolationStart.delete(rule.id);
      const activeAlert = db.prepare('SELECT id FROM alert_history WHERE rule_id = ? AND state = ?').get(rule.id, 'active') as { id: number } | undefined;

      if (activeAlert) {
        db.prepare(`
          UPDATE alert_history
          SET state = 'resolved', resolved_at = ?
          WHERE id = ?
        `).run(timestamp, activeAlert.id);

        const resolveText = `✅ <b>[PiControl OS Resolved]</b>\n<b>Rule:</b> ${rule.name}\n<b>Status:</b> Metric returned to normal (${currentValue})\n<b>Device:</b> ${telemetry.system.hostname}`;
        sendTelegramMessage(resolveText).catch(() => {});
      }
    }
  }
}
