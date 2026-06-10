import { isTauri } from "@tauri-apps/api/core";

export interface AppUpdateState {
  available: boolean;
  currentVersion?: string;
  version?: string;
  notes?: string;
  date?: string;
}

export async function checkForAppUpdate(): Promise<AppUpdateState> {
  if (!isTauri()) {
    return { available: false };
  }

  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check({ timeout: 30_000 });

  if (!update) {
    return { available: false };
  }

  return {
    available: true,
    currentVersion: update.currentVersion,
    version: update.version,
    notes: update.body,
    date: update.date,
  };
}

export async function installAppUpdate(onProgress?: (progress: number | null) => void): Promise<void> {
  if (!isTauri()) {
    throw new Error("Les mises a jour sont disponibles uniquement dans l'application desktop.");
  }

  const { check } = await import("@tauri-apps/plugin-updater");
  const { relaunch } = await import("@tauri-apps/plugin-process");
  const update = await check({ timeout: 30_000 });

  if (!update) {
    throw new Error("Aucune mise a jour disponible.");
  }

  let downloaded = 0;
  let total: number | undefined;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      downloaded = 0;
      total = event.data.contentLength;
      onProgress?.(total ? 0 : null);
    }

    if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      onProgress?.(total ? Math.round((downloaded / total) * 100) : null);
    }

    if (event.event === "Finished") {
      onProgress?.(100);
    }
  });

  await relaunch();
}
