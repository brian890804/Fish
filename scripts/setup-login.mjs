// 設定登入的帳號與密碼（存成 Cloudflare Worker 的 secret，不會寫進程式或 repo）。
// 用法：在 Fish 資料夾執行 node scripts/setup-login.mjs，依照提示輸入。
// 密碼輸入時不會顯示任何字，這是正常的。同時會產生一組 AUTH_SECRET 用來簽登入 cookie。
import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = () => {}; // 不回顯輸入的字
    process.stdout.write(question);
    rl.question("", (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const username = (await ask("帳號（英文、數字、底線、點或減號）：")).trim();
if (!/^[A-Za-z0-9_.-]{2,40}$/.test(username)) {
  console.error("帳號格式不正確，請重新執行。");
  process.exit(1);
}
const password = await ask("密碼（至少 8 個字元，輸入時不會顯示）：", true);
const again = await ask("再輸入一次密碼：", true);
if (password !== again) {
  console.error("兩次密碼不一樣，請重新執行。");
  process.exit(1);
}
if (password.length < 8) {
  console.error("密碼至少要 8 個字元，請重新執行。");
  process.exit(1);
}

const secret = randomBytes(32).toString("base64url");
for (const [name, value] of [
  ["APP_USERNAME", username],
  ["APP_PASSWORD", password],
  ["AUTH_SECRET", secret],
]) {
  console.log(`設定 ${name}…`);
  const r = spawnSync("npx", ["wrangler", "secret", "put", name], { input: value, stdio: ["pipe", "inherit", "inherit"] });
  if (r.status !== 0) {
    console.error(`設定 ${name} 失敗，請把上面的錯誤訊息貼給我。`);
    process.exit(1);
  }
}
console.log("完成！現在用剛剛設定的帳號密碼登入 App，之後這台裝置就不用再登入。");
