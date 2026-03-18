import { CommonModule } from '@angular/common';
import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'task-management.tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Task[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((task) => ({
      ...task,
      completed: Boolean(task.completed),
      createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
    }));
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore write errors (e.g., private mode)
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

@Component({
  standalone: true,
  selector: 'task-management',
  imports: [CommonModule, FormsModule],
  host: { class: 'task-management' },
  template: `
    <section class="task-card">
      <header class="task-card__header">
        <h2 class="task-card__title">Your tasks</h2>
        <p class="task-card__subtitle">
          <span *ngIf="tasks().length; else noTasks">
            {{ remainingCount() }} remaining · {{ completedCount() }} done
          </span>
          <ng-template #noTasks>Start by adding a task below.</ng-template>
        </p>
      </header>

      <form class="task-form" (submit)="$event.preventDefault(); addTask()">
        <input
          class="task-form__input"
          type="text"
          placeholder="Add a new task…"
          [(ngModel)]="newTaskTitle"
          name="newTaskTitle"
          (keydown.enter)="$event.preventDefault(); addTask()"
        />
        <button class="task-form__button" type="button" (click)="addTask()" [disabled]="!newTaskTitle().trim()">
          Add
        </button>
      </form>

      <div class="task-filter">
        <button
          type="button"
          (click)="setFilter('all')"
          [class.active]="filter() === 'all'"
        >
          All
        </button>
        <button
          type="button"
          (click)="setFilter('active')"
          [class.active]="filter() === 'active'"
        >
          Active
        </button>
        <button
          type="button"
          (click)="setFilter('completed')"
          [class.active]="filter() === 'completed'"
        >
          Done
        </button>
      </div>

      <ul class="task-list" *ngIf="visibleTasks().length; else empty">
        <li class="task-item" *ngFor="let task of visibleTasks()">
          <label class="task-item__label">
            <input
              type="checkbox"
              [checked]="task.completed"
              (change)="toggle(task)"
            />
            <span [class.completed]="task.completed">{{ task.title }}</span>
          </label>

          <button type="button" class="task-item__remove" (click)="remove(task)">
            ✕
          </button>
        </li>
      </ul>

      <ng-template #empty>
        <p class="task-empty">No tasks match your filter.</p>
      </ng-template>

      <footer class="task-card__footer" *ngIf="tasks().length">
        <button
          type="button"
          class="task-clear"
          (click)="clearCompleted()"
          [disabled]="!completedCount()"
        >
          Clear completed
        </button>
      </footer>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 480px;
      }

      .task-card {
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 16px 40px rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
      }

      .task-card__header {
        margin-bottom: 1.25rem;
      }

      .task-card__title {
        margin: 0;
        font-size: 1.5rem;
        line-height: 1.2;
      }

      .task-card__subtitle {
        margin: 0.35rem 0 0;
        color: rgba(0, 0, 0, 0.65);
        font-size: 0.95rem;
      }

      .task-form {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .task-form__input {
        flex: 1;
        padding: 0.75rem 0.9rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(0, 0, 0, 0.17);
        font-size: 1rem;
        outline: none;
        transition: border-color 0.15s ease;
      }

      .task-form__input:focus {
        border-color: rgba(59, 130, 246, 1);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
      }

      .task-form__button {
        border: none;
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        background: linear-gradient(135deg, #4f46e5, #a855f7);
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s ease, filter 0.1s ease;
      }

      .task-form__button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .task-form__button:not(:disabled):active {
        transform: translateY(1px);
      }

      .task-filter {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .task-filter button {
        flex: 1;
        border-radius: 999px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: transparent;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .task-filter button.active {
        background: rgba(99, 102, 241, 0.15);
        border-color: rgba(99, 102, 241, 0.35);
      }

      .task-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.5rem;
      }

      .task-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 0.85rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(0, 0, 0, 0.1);
        background: rgba(255, 255, 255, 0.65);
      }

      .task-item__label {
        display: flex;
        gap: 0.7rem;
        align-items: center;
        flex: 1;
        margin: 0;
      }

      .task-item__label input {
        width: 1.1rem;
        height: 1.1rem;
        accent-color: rgb(80, 102, 244);
      }

      .task-item__label span {
        font-size: 1rem;
        word-break: break-word;
      }

      .task-item__label span.completed {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .task-item__remove {
        border: none;
        background: transparent;
        color: rgba(0, 0, 0, 0.5);
        cursor: pointer;
        font-size: 1.1rem;
        padding: 0.25rem;
        border-radius: 0.5rem;
        transition: background 0.15s ease;
      }

      .task-item__remove:hover {
        background: rgba(0, 0, 0, 0.08);
      }

      .task-empty {
        margin: 0;
        padding: 1rem 0;
        color: rgba(0, 0, 0, 0.55);
        text-align: center;
      }

      .task-card__footer {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
      }

      .task-clear {
        border: none;
        background: transparent;
        color: rgba(0, 0, 0, 0.65);
        cursor: pointer;
        padding: 0.5rem 0.75rem;
        border-radius: 0.75rem;
        transition: background 0.15s ease;
      }

      .task-clear:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .task-clear:not(:disabled):hover {
        background: rgba(0, 0, 0, 0.07);
      }
    `,
  ],
})
export class TaskManagementComponent {
  tasks = signal<Task[]>(loadTasks());
  newTaskTitle = signal('');
  filter = signal<'all' | 'active' | 'completed'>('all');

  visibleTasks = computed(() => {
    const filter = this.filter();
    return this.tasks().filter((task) => {
      if (filter === 'active') return !task.completed;
      if (filter === 'completed') return task.completed;
      return true;
    });
  });

  completedCount = computed(() => this.tasks().filter((t) => t.completed).length);
  remainingCount = computed(() => this.tasks().length - this.completedCount());

  constructor() {
    effect(() => {
      saveTasks(this.tasks());
    });
  }

  addTask() {
    const title = this.newTaskTitle().trim();
    if (!title) {
      return;
    }

    this.tasks.update((tasks) => [
      ...tasks,
      {
        id: generateId(),
        title,
        completed: false,
        createdAt: Date.now(),
      },
    ]);

    this.newTaskTitle.set('');
    this.filter.set('all');
  }

  toggle(task: Task) {
    this.tasks.update((tasks) =>
      tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)),
    );
  }

  remove(task: Task) {
    this.tasks.update((tasks) => tasks.filter((t) => t.id !== task.id));
  }

  clearCompleted() {
    this.tasks.update((tasks) => tasks.filter((t) => !t.completed));
  }

  setFilter(value: 'all' | 'active' | 'completed') {
    this.filter.set(value);
  }
}
