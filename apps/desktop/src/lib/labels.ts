import type { TaskStatus, ProjectStatus } from "@quantic/shared";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "À faire",
  doing: "En cours",
  done: "Terminé",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Actif",
  paused: "En pause",
  done: "Terminé",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
