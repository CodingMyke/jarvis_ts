/**
 * Rappresentazione di un task Google nel formato "todo":
 * id, text, completed, createdAt, updatedAt.
 * Usata dall'API e dai consumer (TodoContext, tool) per compatibilità con il vecchio sistema.
 */
export interface TodoFromTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Opzioni per elencare i task.
 */
export interface GetTasksOptions {
  taskListId?: string;
  showCompleted?: boolean;
  maxResults?: number;
}

/**
 * Risultato del get tasks.
 */
export interface GetTasksResult {
  tasks: TodoFromTask[];
  taskListId: string;
}

/**
 * Opzioni per creare un task.
 */
export interface CreateTaskOptions {
  taskListId: string;
  title: string;
  notes?: string;
}

/**
 * Risultato della creazione.
 */
export interface CreateTaskResult {
  success: boolean;
  task?: TodoFromTask;
  error?: string;
}

/**
 * Opzioni per aggiornare un task.
 */
export interface UpdateTaskOptions {
  taskListId: string;
  taskId: string;
  title?: string;
  completed?: boolean;
}

/**
 * Risultato dell'aggiornamento.
 */
export interface UpdateTaskResult {
  success: boolean;
  task?: TodoFromTask;
  error?: string;
}

/**
 * Risultato della cancellazione.
 */
export interface DeleteTaskResult {
  success: boolean;
  error?: string;
}
