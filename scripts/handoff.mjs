// npm run handoff [-- --testes] → gera docs/HANDOFF.md (≤ 150 linhas). Determinístico, sem IA, sem rede.
// Falha (exit 1) e NÃO grava se o resultado tiver token ou conta bancária completa.
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const raiz = process.cwd();
const env = { ...process.env, PATH: `${process.env.PATH};C:\\Program Files\\Git\\cmd` };
const sh = (c) => { try { return execSync(c, { cwd: raiz, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
const ler = (p) => { try { return fs.readFileSync(path.join(raiz, p), "utf8").replace(/^\uFEFF/, ""); } catch { return null; } };
const mtime = (p) => { try { return fs.statSync(path.join(raiz, p)).mtime; } catch { return null; } };
const fmt = (d) => d ? d.toLocaleString("pt-BR") : "não existe";
const MAX = 150;

// ---- testes ----
const arqTestes = path.join(raiz, ".handoff-testes.json");
if (process.argv.includes("--testes")) {
  const r = spawnSync("npm test", { cwd: raiz, shell: true, encoding: "utf8", env });
  const out = `${r.stdout}\n${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
  const resumo = (out.match(/Tests\s+[^\n]*/) ?? ["Tests: ?"])[0].trim();
  const falhas = [...new Set(out.split("\n").filter((l) => /FAIL|AssertionError|×/.test(l)).map((l) => l.trim()))].slice(0, 6);
  fs.writeFileSync(arqTestes, JSON.stringify({ quando: new Date().toISOString(), ok: r.status === 0, resumo, falhas }));
}
const t = (() => { try { return JSON.parse(fs.readFileSync(arqTestes, "utf8")); } catch { return null; } })();

// ---- git ----
const branch = sh("git rev-parse --abbrev-ref HEAD") || "?";
// aspas duplas: o cmd do Windows não entende aspas simples
const ultimo = sh('git log -1 "--format=%h %s"') || "sem commits";
const commits = sh('git log -10 "--format=%h %s"').split("\n").filter(Boolean);
const modif = sh("git status --short").split("\n").filter(Boolean);

// ---- artefatos ----
const cont = (d) => { try { return fs.readdirSync(path.join(raiz, d)).length; } catch { return 0; } };
const recente = (p, min) => { const m = mtime(p); return m && Date.now() - m.getTime() < min * 60_000; };
const emAndamento = recente("analise/ablacao_llm_puro.json", 10) || recente("analise/ablacao.json", 10);

// ---- rotas ----
function rotas(dir, base = "/api") {
  let out = [];
  let itens = [];
  try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const i of itens) {
    if (i.isDirectory()) out = out.concat(rotas(path.join(dir, i.name), `${base}/${i.name}`));
    else if (i.name === "route.ts") {
      const metodos = [...(ler(path.relative(raiz, path.join(dir, i.name))) ?? "").matchAll(/export (?:async )?function (GET|POST|PUT|DELETE)/g)].map((m) => m[1]);
      out.push(`${metodos.join("/") || "?"} ${base}`);
    }
  }
  return out;
}

// ---- env: SÓ nomes ----
const nomesEnv = [...new Set([".env.example", ".env", ".env.local"].flatMap((f) => (ler(f) ?? "").split("\n").map((l) => /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(l)?.[1]).filter(Boolean)))];

// ---- STATUS / RETOMADA ----
const status = (ler("docs/STATUS.md") ?? "(docs/STATUS.md não existe)").trimEnd();
const retomada = (ler("docs/RETOMADA.md") ?? "(docs/RETOMADA.md não existe)").trimEnd();
const pend = (() => {
  const m = /##\s*Pendências do usuário\s*\n([\s\S]*?)(?=\n##\s|$)/i.exec(status);
  return m ? m[1].trim() : "(seção ausente em STATUS.md)";
})();

function montar(maxMod) {
  const L = [];
  L.push("# HANDOFF (gerado por `npm run handoff`; não editar à mão)", "");
  L.push(`Gerado: ${new Date().toLocaleString("pt-BR")} · branch: ${branch} · último commit: ${ultimo}`, "");
  L.push("## git", ...commits.map((c) => `- ${c}`));
  L.push(modif.length ? `Não commitados (${modif.length}): ${modif.slice(0, maxMod).map((l) => l.trim()).join(" | ")}${modif.length > maxMod ? ` | +${modif.length - maxMod}` : ""}` : "Árvore limpa.", "");
  L.push("## Testes", t ? `${t.ok ? "OK" : "FALHOU"} em ${new Date(t.quando).toLocaleString("pt-BR")}: ${t.resumo}${t.falhas.length ? `\nFalhas: ${t.falhas.join(" | ")}` : ""}` : "não rodado (use `npm run handoff -- --testes`)", "");
  L.push("## Artefatos");
  L.push(`- analise/ablacao.json: ${fmt(mtime("analise/ablacao.json"))} · analise/snapshot.json: ${fmt(mtime("analise/snapshot.json"))} · analise/estado_agenda.json: ${fmt(mtime("analise/estado_agenda.json"))}`);
  L.push(`- analise/replay/: ${cont("analise/replay")} arquivo(s) · public/agentes/: ${cont("public/agentes")} arquivo(s)`);
  L.push(emAndamento ? "- ATENÇÃO: ablação possivelmente em andamento (arquivos de ablação alterados nos últimos 10 min); confira analise/ablacao.json e analise/ablacao_llm_puro.json antes de rodar de novo." : "- Nenhum job longo aparenta estar em andamento.", "");
  L.push("## Rotas", rotas(path.join(raiz, "app", "api")).sort().join(" · "), "");
  L.push("## Variáveis de ambiente (só nomes)", nomesEnv.join(", ") || "(nenhuma)", "");
  L.push("## STATUS (docs/STATUS.md, integral)", status, "");
  L.push("## Pendências do usuário", pend, "");
  L.push("## Prompt de retomada (docs/RETOMADA.md)", retomada, "");
  return L.join("\n");
}

let md = montar(8);
if (md.split("\n").length > MAX) md = montar(3);
const linhas = md.split("\n").length;
if (linhas > MAX) { console.error(`FALHA: HANDOFF com ${linhas} linhas (máx. ${MAX}). Enxugue docs/STATUS.md (≤ 80) ou docs/RETOMADA.md.`); process.exit(1); }

// ---- segredos: token ou conta completa ----
const falhas = [];
// prefixo montado em duas partes: o próprio fonte não pode conter o literal (regra do pre-commit)
if (new RegExp("gw-tok" + "-").test(md)) falhas.push("token do proxy");
const csv = ler("pagamentos/fornecedores.csv") ?? "";
const contas = new Set();
for (const l of csv.split("\n").slice(1)) { const m = /\b(\d{5,}-\d)\b/.exec(l.split(",").slice(7, 10).join(",")); if (m) contas.add(m[1]); }
const vazadas = [...contas].filter((c) => md.includes(c));
if (vazadas.length) falhas.push(`${vazadas.length} conta(s) bancária(s) completa(s)`);
if (falhas.length) { console.error(`BLOQUEADO: ${falhas.join("; ")}. docs/HANDOFF.md NÃO foi gravado.`); process.exit(1); }

fs.writeFileSync(path.join(raiz, "docs", "HANDOFF.md"), md);
console.log(`docs/HANDOFF.md gravado (${linhas} linhas)`);
