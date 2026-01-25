/**
 * Manager per gestire i todo.
 * Permette ai tool di gestire i todo e ai componenti React di ascoltare gli aggiornamenti.
 */

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

type TodoCallback = (todos: Todo[]) => void;

class TodoManager {
  private todos: Map<string, Todo> = new Map();
  private listeners: Set<TodoCallback> = new Set();
  private storageKey = "jarvis_todos";

  constructor() {
    // Carica i todo dal localStorage all'avvio
    this.loadFromStorage();
  }

  /**
   * Carica i todo dal localStorage.
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === "undefined") return;

      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const todos = JSON.parse(stored) as Todo[];
      todos.forEach((todo) => {
        this.todos.set(todo.id, todo);
      });

      this.notifyListeners();
    } catch (error) {
      console.error("[TodoManager] Errore nel caricamento da localStorage:", error);
    }
  }

  /**
   * Salva i todo nel localStorage.
   */
  private saveToStorage(): void {
    try {
      if (typeof window === "undefined") return;

      const todos = Array.from(this.todos.values());
      localStorage.setItem(this.storageKey, JSON.stringify(todos));
    } catch (error) {
      console.error("[TodoManager] Errore nel salvataggio su localStorage:", error);
    }
  }

  /**
   * Crea un nuovo todo.
   */
  createTodo(text: string): Todo {
    const id = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const todo: Todo = {
      id,
      text: text.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.todos.set(id, todo);
    this.saveToStorage();
    this.notifyListeners();

    return todo;
  }

  /**
   * Ottiene tutti i todo.
   */
  getAllTodos(): Todo[] {
    return Array.from(this.todos.values()).sort((a, b) => {
      // Prima i non completati, poi i completati
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Tra quelli con lo stesso stato, più recenti prima
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * Ottiene un todo per ID.
   */
  getTodoById(id: string): Todo | null {
    return this.todos.get(id) || null;
  }

  /**
   * Aggiorna un todo esistente.
   */
  updateTodo(id: string, updates: Partial<Pick<Todo, "text" | "completed">>): Todo | null {
    const todo = this.todos.get(id);
    if (!todo) {
      return null;
    }

    const updatedTodo: Todo = {
      ...todo,
      ...updates,
      updatedAt: Date.now(),
    };

    this.todos.set(id, updatedTodo);
    this.saveToStorage();
    this.notifyListeners();

    return updatedTodo;
  }

  /**
   * Elimina un todo.
   */
  deleteTodo(id: string): boolean {
    const existed = this.todos.delete(id);
    if (existed) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return existed;
  }

  /**
   * Elimina tutti i todo completati.
   */
  deleteCompletedTodos(): number {
    let deletedCount = 0;
    for (const [id, todo] of this.todos.entries()) {
      if (todo.completed) {
        this.todos.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }

    return deletedCount;
  }

  /**
   * Sottoscrive agli aggiornamenti dei todo.
   */
  subscribe(callback: TodoCallback): () => void {
    this.listeners.add(callback);

    // Notifica immediatamente lo stato corrente
    callback(this.getAllTodos());

    // Restituisce la funzione di unsubscribe
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica tutti i listener dello stato corrente.
   */
  private notifyListeners(): void {
    const todos = this.getAllTodos();
    for (const listener of this.listeners) {
      listener(todos);
    }
  }
}

// Singleton instance
export const todoManager = new TodoManager();
