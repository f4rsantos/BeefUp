import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
const DOC_PATH = ["beefup", "clients"];

export function extractConfig(input) {
  let raw = input.trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) raw = m[0];
  raw = raw.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":').replace(/'/g, '"').replace(/,(\s*[}\]])/g, "$1");
  const parsed = JSON.parse(raw);
  const config = {};
  for (const k of CONFIG_KEYS) if (parsed[k]) config[k] = parsed[k];
  if (!config.projectId || !config.apiKey) throw new Error("Missing projectId or apiKey");
  return config;
}

function appFor(config) {
  for (const a of getApps()) if (a.name === "sync") return a;
  return initializeApp(config, "sync");
}

export async function pushClients(config, clients) {
  const app = appFor(config);
  const dbf = getFirestore(app);
  await setDoc(doc(dbf, DOC_PATH[0], DOC_PATH[1]), { clients, updatedAt: Date.now() });
}

export async function pullClients(config) {
  const app = appFor(config);
  const dbf = getFirestore(app);
  const snap = await getDoc(doc(dbf, DOC_PATH[0], DOC_PATH[1]));
  return snap.exists() ? snap.data().clients || [] : [];
}

export async function disposeSyncApp() {
  for (const a of getApps()) if (a.name === "sync") await deleteApp(a);
}
