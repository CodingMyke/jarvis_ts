import { NextRequest } from "next/server";
import { jsonError } from "@/app/_server";
import {
  handleCreateTask,
  handleDeleteTask,
  handleGetTasks,
  handleUpdateTask,
} from "@/app/_features/tasks";

export async function GET() {
  try {
    return await handleGetTasks();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message,
      errorMessage: message,
      todos: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleCreateTask(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: message,
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleUpdateTask(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: message,
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    return await handleDeleteTask(body, request.nextUrl.searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: message,
    });
  }
}
