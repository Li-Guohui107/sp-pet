import { CATEGORY_NAMES, categoryFor, shouldIgnoreFile } from "../../shared/desktop-plan.mjs";

export type LooseFile = {
  name: string;
  category: string;
  handle: FileSystemFileHandle;
};

const DB_NAME = "sppet-desk";
const STORE = "handles";

export async function scanDirectory(dir: FileSystemDirectoryHandle) {
  const files: LooseFile[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file" || shouldIgnoreFile(name)) continue;
    files.push({ name, category: categoryFor(name), handle: handle as FileSystemFileHandle });
    if (files.length >= 500) break;
  }
  files.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return files;
}

export async function moveIntoCategory(root: FileSystemDirectoryHandle, file: LooseFile) {
  const folder = await root.getDirectoryHandle(file.category, { create: true });
  const targetName = await uniqueName(folder, file.name);
  const source = await file.handle.getFile();
  const target = await folder.getFileHandle(targetName, { create: true });
  const writable = await target.createWritable();
  try {
    await writable.write(await source.arrayBuffer());
    await writable.close();
  } catch (error) {
    try {
      await folder.removeEntry(targetName);
    } catch {
      // 没写完的目标文件清不掉时，保留原文件即可。
    }
    throw error;
  }
  try {
    await root.removeEntry(file.name);
  } catch {
    return `${targetName}（原文件仍留在原处）`;
  }
  return targetName;
}

export async function rememberDirectory(dir: FileSystemDirectoryHandle) {
  const database = await openDb();
  const tx = database.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(dir, "desktop");
  await transactionDone(tx);
}

export async function recallDirectory() {
  const database = await openDb();
  const tx = database.transaction(STORE, "readonly");
  const handle = await request<FileSystemDirectoryHandle | undefined>(tx.objectStore(STORE).get("desktop"));
  return handle ?? null;
}

export async function permissionGranted(dir: FileSystemDirectoryHandle, ask: boolean) {
  const mode = { mode: "readwrite" as const };
  if ((await dir.queryPermission(mode)) === "granted") return true;
  if (!ask) return false;
  return (await dir.requestPermission(mode)) === "granted";
}

export async function pickDirectory() {
  if (!window.showDirectoryPicker) {
    throw new Error("用 Chrome 或 Edge 打开后，就可以选择要整理的文件夹。");
  }
  return window.showDirectoryPicker({ mode: "readwrite", id: "sppet-desktop" });
}

export { CATEGORY_NAMES, categoryFor };

async function uniqueName(folder: FileSystemDirectoryHandle, name: string) {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  for (let index = 2; index < 40; index += 1) {
    try {
      await folder.getFileHandle(candidate);
      candidate = `${stem} (${index})${ext}`;
    } catch {
      return candidate;
    }
  }
  return candidate;
}

function openDb() {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => {
    if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
  };
  return new Promise<IDBDatabase>((resolve, reject) => {
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transactionDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
