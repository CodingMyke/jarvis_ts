import { NextRequest, NextResponse } from "next/server";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  deleteCompletedTasks,
  deleteAllTasks,
  isTasksConfigured,
} from "@/app/lib/tasks";

/**
 * GET: Elenco todo (task Google) dalla lista di default.
 */
export async function GET() {
  try {
    if (!isTasksConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "TASKS_NOT_CONFIGURED",
          message: "Google Tasks non è configurato. Vedi app/lib/tasks/GOOGLE_TASKS_SETUP.md",
          todos: [],
        },
        { status: 200 }
      );
    }
    const { tasks } = await getTasks({ showCompleted: true });
    const completedCount = tasks.filter((t) => t.completed).length;
    const pendingCount = tasks.length - completedCount;
    return NextResponse.json({
      success: true,
      todos: tasks,
      count: tasks.length,
      completedCount,
      pendingCount,
    });
  } catch (error) {
    console.error("[GET /api/tasks] Errore:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message: msg, todos: [] },
      { status: 500 }
    );
  }
}

/**
 * POST: Crea uno o più todo.
 * Body: { text: string } oppure { texts: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isTasksConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "TASKS_NOT_CONFIGURED",
          errorMessage: "Google Tasks non è configurato.",
        },
        { status: 200 }
      );
    }
    const body = (await request.json()) as { text?: string; texts?: string[] };
    const text = body.text;
    const texts = body.texts;

    if (text !== undefined) {
      const t = (typeof text === "string" ? text : "").trim();
      if (!t) {
        return NextResponse.json(
          { success: false, error: "INVALID_TEXT", errorMessage: "Il testo non può essere vuoto" },
          { status: 400 }
        );
      }
      if (t.length > 500) {
        return NextResponse.json(
          { success: false, error: "TEXT_TOO_LONG", errorMessage: "Il testo non può superare i 500 caratteri" },
          { status: 400 }
        );
      }
      const result = await createTask(t);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "CREATION_FAILED", errorMessage: result.error },
          { status: 500 }
        );
      }
      const todo = result.task!;
      return NextResponse.json({
        success: true,
        todo: { id: todo.id, text: todo.text, completed: todo.completed },
      });
    }

    if (Array.isArray(texts) && texts.length > 0) {
      const valid = texts
        .map((s) => (typeof s === "string" ? s : "").trim())
        .filter((s) => s.length > 0 && s.length <= 500);
      if (valid.length === 0) {
        return NextResponse.json(
          { success: false, error: "INVALID_TEXTS", errorMessage: "Nessun testo valido" },
          { status: 400 }
        );
      }
      const todos: { id: string; text: string; completed: boolean }[] = [];
      for (const title of valid) {
        const result = await createTask(title);
        if (result.success && result.task) {
          todos.push({
            id: result.task.id,
            text: result.task.text,
            completed: result.task.completed,
          });
        }
      }
      return NextResponse.json({ success: true, todos, count: todos.length });
    }

    return NextResponse.json(
      { success: false, error: "MISSING_PARAMETER", errorMessage: "Fornire 'text' o 'texts'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[POST /api/tasks] Errore:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", errorMessage: msg },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Aggiorna uno o più todo.
 * Body: { id, text?, completed? } oppure { updates: [{ id, text?, completed? }] }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!isTasksConfigured()) {
      return NextResponse.json(
        { success: false, error: "TASKS_NOT_CONFIGURED", errorMessage: "Google Tasks non è configurato." },
        { status: 200 }
      );
    }
    const body = (await request.json()) as {
      id?: string;
      text?: string;
      completed?: boolean;
      updates?: Array<{ id: string; text?: string; completed?: boolean }>;
    };

    if (body.id) {
      const updates: { text?: string; completed?: boolean } = {};
      if (body.text !== undefined) {
        const t = String(body.text).trim();
        if (!t) {
          return NextResponse.json(
            { success: false, error: "INVALID_TEXT", errorMessage: "Il testo non può essere vuoto" },
            { status: 400 }
          );
        }
        if (t.length > 500) {
          return NextResponse.json(
            { success: false, error: "TEXT_TOO_LONG", errorMessage: "Il testo non può superare i 500 caratteri" },
            { status: 400 }
          );
        }
        updates.text = t;
      }
      if (body.completed !== undefined) updates.completed = Boolean(body.completed);
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, error: "NO_UPDATES", errorMessage: "Nessun aggiornamento specificato" },
          { status: 400 }
        );
      }
      const result = await updateTask(body.id, updates);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "UPDATE_FAILED", errorMessage: result.error },
          { status: 500 }
        );
      }
      const todo = result.task!;
      return NextResponse.json({
        success: true,
        todo: { id: todo.id, text: todo.text, completed: todo.completed },
      });
    }

    if (Array.isArray(body.updates) && body.updates.length > 0) {
      const todos: { id: string; text: string; completed: boolean }[] = [];
      const failedIds: string[] = [];
      for (const u of body.updates) {
        if (!u.id) continue;
        const updates: { text?: string; completed?: boolean } = {};
        if (u.text !== undefined) {
          const t = String(u.text).trim();
          if (!t || t.length > 500) {
            failedIds.push(u.id);
            continue;
          }
          updates.text = t;
        }
        if (u.completed !== undefined) updates.completed = Boolean(u.completed);
        if (Object.keys(updates).length === 0) {
          failedIds.push(u.id);
          continue;
        }
        const result = await updateTask(u.id, updates);
        if (result.success && result.task) {
          todos.push({
            id: result.task.id,
            text: result.task.text,
            completed: result.task.completed,
          });
        } else {
          failedIds.push(u.id);
        }
      }
      return NextResponse.json({
        success: true,
        todos,
        count: todos.length,
        requestedCount: body.updates.length,
        ...(failedIds.length > 0 ? { failedIds } : {}),
      });
    }

    return NextResponse.json(
      { success: false, error: "MISSING_PARAMETER", errorMessage: "Fornire 'id' o 'updates'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[PATCH /api/tasks] Errore:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", errorMessage: msg },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Elimina uno o più todo, o tutti, o solo i completati.
 * Body: { id?: string, ids?: string[], deleteAll?: boolean, deleteCompleted?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isTasksConfigured()) {
      return NextResponse.json(
        { success: false, error: "TASKS_NOT_CONFIGURED", errorMessage: "Google Tasks non è configurato." },
        { status: 200 }
      );
    }
    let body: { id?: string; ids?: string[]; deleteAll?: boolean; deleteCompleted?: boolean } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      // DELETE senza body
    }
    const id = body?.id ?? (request.nextUrl.searchParams.get("id") ?? undefined);
    const ids = body?.ids;
    const deleteAll = body?.deleteAll === true;
    const deleteCompleted = body?.deleteCompleted === true;

    if (deleteCompleted) {
      const result = await deleteCompletedTasks();
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "DELETE_FAILED", errorMessage: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, deletedCompleted: true });
    }

    if (deleteAll) {
      const { success, deletedCount, error } = await deleteAllTasks();
      if (!success) {
        return NextResponse.json(
          { success: false, error: "DELETE_FAILED", errorMessage: error },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, deletedAll: true, count: deletedCount });
    }

    if (id && !ids) {
      const result = await deleteTask(id);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "DELETE_FAILED", errorMessage: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, deletedTodo: { id } });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const deletedTodos: { id: string; text: string }[] = [];
      const { tasks } = await getTasks({ showCompleted: true });
      const byId = new Map(tasks.map((t) => [t.id, t]));
      let count = 0;
      for (const taskId of ids) {
        const t = byId.get(taskId);
        const result = await deleteTask(taskId);
        if (result.success) {
          count++;
          if (t) deletedTodos.push({ id: t.id, text: t.text });
        }
      }
      return NextResponse.json({
        success: true,
        deletedTodos,
        count,
        requestedCount: ids.length,
      });
    }

    return NextResponse.json(
      { success: false, error: "MISSING_PARAMETER", errorMessage: "Fornire 'id', 'ids', 'deleteAll' o 'deleteCompleted'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[DELETE /api/tasks] Errore:", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", errorMessage: msg },
      { status: 500 }
    );
  }
}
