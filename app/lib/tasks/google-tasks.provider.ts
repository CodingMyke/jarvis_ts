import type {
  GetTasksOptions,
  GetTasksResult,
  CreateTaskOptions,
  CreateTaskResult,
  UpdateTaskOptions,
  UpdateTaskResult,
  DeleteTaskResult,
  TodoFromTask,
} from "./types";

const TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";

interface GoogleTasksConfig {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Mappa un task Google al formato TodoFromTask.
 */
function mapGoogleTaskToTodo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gt: any,
  taskListId: string
): TodoFromTask {
  const updated = gt.updated ? new Date(gt.updated).getTime() : Date.now();
  return {
    id: gt.id,
    text: gt.title || "",
    completed: gt.status === "completed",
    createdAt: updated,
    updatedAt: updated,
  };
}

export class GoogleTasksProvider {
  readonly name = "Google Tasks";
  private config: GoogleTasksConfig;

  constructor(config: GoogleTasksConfig = {}) {
    this.config = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      clientId: config.clientId || process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    };
  }

  isConfigured(): boolean {
    return !!(
      this.config.accessToken ||
      (this.config.refreshToken && this.config.clientId && this.config.clientSecret)
    );
  }

  private async getValidAccessToken(forceRefresh = false): Promise<string | null> {
    if (this.config.accessToken) return this.config.accessToken;
    if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      return null;
    }
    if (!forceRefresh && cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
      return cachedAccessToken.token;
    }
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 400 || response.status === 401) {
          try {
            const d = JSON.parse(errText);
            if (d.error === "invalid_grant" || d.error === "invalid_request") {
              throw new Error(
                "REFRESH_TOKEN_EXPIRED: Il refresh token è scaduto o revocato. " +
                  "Riautorizza l'app (scope tasks). Vedi app/lib/tasks/GOOGLE_TASKS_SETUP.md"
              );
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes("REFRESH_TOKEN_EXPIRED")) throw e;
          }
        }
        return null;
      }
      const data = (await response.json()) as { access_token: string; expires_in?: number };
      const expiresIn = data.expires_in ?? 3600;
      cachedAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + (expiresIn - 300) * 1000,
      };
      return cachedAccessToken.token;
    } catch (e) {
      if (e instanceof Error && e.message.includes("REFRESH_TOKEN_EXPIRED")) throw e;
      console.error("[GoogleTasksProvider] refresh token error:", e);
      return null;
    }
  }

  private invalidateTokenCache(): void {
    cachedAccessToken = null;
  }

  private async request(
    url: string,
    options: RequestInit = {},
    retryOn401 = true
  ): Promise<Response> {
    let token: string | null;
    try {
      token = await this.getValidAccessToken();
    } catch {
      token = null;
    }
    const headers: HeadersInit = {
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    let res = await fetch(url, { ...options, headers });
    if (res.status === 401 && retryOn401 && this.config.refreshToken) {
      this.invalidateTokenCache();
      token = await this.getValidAccessToken(true);
      if (token) {
        res = await fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${token}` } });
      }
    }
    return res;
  }

  /**
   * Restituisce l'elenco delle task list dell'utente.
   */
  async getTaskLists(): Promise<{ id: string; title: string }[]> {
    if (!this.isConfigured()) return [];
    const res = await this.request(`${TASKS_API_BASE}/users/@me/lists`);
    if (!res.ok) {
      if (res.status === 401) throw new Error("REFRESH_TOKEN_EXPIRED");
      return [];
    }
    const data = (await res.json()) as { items?: { id: string; title: string }[] };
    return (data.items || []).map((i) => ({ id: i.id, title: i.title }));
  }

  async getTasks(options: GetTasksOptions = {}): Promise<GetTasksResult> {
    const { taskListId, showCompleted = true, maxResults = 100 } = options;
    const empty: GetTasksResult = { tasks: [], taskListId: taskListId || "" };
    if (!taskListId) return empty;
    if (!this.isConfigured()) return empty;

    const params = new URLSearchParams({
      showCompleted: String(showCompleted),
      maxResults: String(maxResults),
    });
    const res = await this.request(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params}`
    );
    if (!res.ok) {
      if (res.status === 401) throw new Error("REFRESH_TOKEN_EXPIRED");
      return empty;
    }
    const data = (await res.json()) as { items?: unknown[] };
    const tasks: TodoFromTask[] = (data.items || []).map((i) =>
      mapGoogleTaskToTodo(i as Record<string, unknown>, taskListId)
    );
    return { tasks, taskListId };
  }

  async createTask(opts: CreateTaskOptions): Promise<CreateTaskResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Google Tasks non configurato" };
    }
    const title = (opts.title || "").trim();
    if (!title) return { success: false, error: "Il titolo del task è obbligatorio" };

    const res = await this.request(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(opts.taskListId)}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes: opts.notes || undefined }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      if (res.status === 401) throw new Error("REFRESH_TOKEN_EXPIRED");
      return { success: false, error: err || `HTTP ${res.status}` };
    }
    const gt = (await res.json()) as Record<string, unknown>;
    const task = mapGoogleTaskToTodo(gt, opts.taskListId);
    return { success: true, task };
  }

  async updateTask(opts: UpdateTaskOptions): Promise<UpdateTaskResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Google Tasks non configurato" };
    }
    const body: Record<string, unknown> = {};
    if (opts.title !== undefined) body.title = opts.title.trim();
    if (opts.completed !== undefined) body.status = opts.completed ? "completed" : "needsAction";
    if (Object.keys(body).length === 0) {
      return { success: false, error: "Nessun campo da aggiornare" };
    }

    const res = await this.request(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(opts.taskListId)}/tasks/${encodeURIComponent(opts.taskId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      if (res.status === 401) throw new Error("REFRESH_TOKEN_EXPIRED");
      return { success: false, error: err || `HTTP ${res.status}` };
    }
    const gt = (await res.json()) as Record<string, unknown>;
    const task = mapGoogleTaskToTodo(gt, opts.taskListId);
    return { success: true, task };
  }

  async deleteTask(taskListId: string, taskId: string): Promise<DeleteTaskResult> {
    if (!this.isConfigured()) return { success: false, error: "Google Tasks non configurato" };
    const res = await this.request(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: "DELETE" }
    );
    if (!res.ok && res.status !== 204) {
      if (res.status === 401) throw new Error("REFRESH_TOKEN_EXPIRED");
      return { success: false, error: `HTTP ${res.status}` };
    }
    return { success: true };
  }

  /**
   * Elimina tutti i task completati dalla lista.
   */
  async clearCompletedTasks(taskListId: string): Promise<DeleteTaskResult> {
    if (!this.isConfigured()) return { success: false, error: "Google Tasks non configurato" };
    const res = await this.request(
      `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/clear`,
      { method: "POST" }
    );
    if (!res.ok && res.status !== 204) {
      if (res.status === 401) throw new Error("REFRESH_TOKEN_EXPIRED");
      return { success: false, error: `HTTP ${res.status}` };
    }
    return { success: true };
  }
}
