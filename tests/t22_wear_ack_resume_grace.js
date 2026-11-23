// Regression tests for command ACKs arriving after the watch screen resumes.
const fs = require('fs');
const path = require('path');
const root = path.dirname(process.argv[2]);
const watch = fs.readFileSync(path.join(root, 'native-wear/src/main/java/com/garajim/wear/WearMainActivity.java'), 'utf8');
let failures = 0;
function check(ok, name) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failures++; }
const resume = watch.match(/protected void onResume\(\)\s*\{([\s\S]*?)\n    \}/);
const pause = watch.match(/protected void onPause\(\)\s*\{([\s\S]*?)\n    \}/);
const restore = watch.match(/private void restorePendingCommand\(\)\s*\{([\s\S]*?)\n    \}/);
const timeout = watch.match(/private void scheduleCommandAckTimeout\(\)\s*\{([\s\S]*?)\n    \}/);
const send = watch.match(/private void send\(String cmd\)\s*\{([\s\S]*?)\n    \}/);
check(!!pause && /activityResumed\s*=\s*false/.test(pause[1]) && /pendingResumeGrace\s*=\s*true/.test(pause[1]) && /persistPendingCommand\(\)/.test(pause[1]),
  'Ekran uykuya giderken bekleyen komut kurtarma kipine kalıcı geçer');
check(!!resume && /activityResumed\s*=\s*true/.test(resume[1]) && /pendingResumeGrace/.test(resume[1]) && /pendingCommandAt\s*=\s*System\.currentTimeMillis\(\)/.test(resume[1]),
  'Ekrana dönüldüğünde geç ACK için kurtarma penceresi yeniden başlatılır');
check(!!restore && /PENDING_RESTORE_TTL_MS/.test(restore[1]) && /pendingResumeGrace\s*=\s*true/.test(restore[1]),
  'Activity yeniden yaratılırsa makul süredeki bekleyen komut geri yüklenir');
check(!!timeout && /pendingResumeGrace\s*\?\s*PENDING_RESTORE_TTL_MS\s*:\s*COMMAND_ACK_TTL_MS/.test(timeout[1]) && /if\s*\(!activityResumed\)\s*return/.test(timeout[1]),
  'Ön planda kısa, ekran uykusunda uzun zaman aşımı kullanılır; arka planda komut silinmez');
check(!!send && /if\s*\(!activityResumed\)\s*pendingResumeGrace\s*=\s*true/.test(send[1]) && /if\s*\(activityResumed\)\s*scheduleCommandAckTimeout\(\)/.test(send[1]),
  'Gönderim tamamlanması ekran uykuya geçmişse bekleyen komut kimliğini korur');
check(!!send && /for\s*\(Node n : nodes\)/.test(send[1]) && /catch\s*\(Exception nodeError\)/.test(send[1]) && /if\s*\(sent\)/.test(send[1]),
  'Tek bir bağlı düğüme gönderim hatası diğer düğümlere aktarımı kesmez');
process.exit(failures ? 1 : 0);
