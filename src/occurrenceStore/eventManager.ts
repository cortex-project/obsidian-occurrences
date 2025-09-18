import { EventRef } from "obsidian"

export type EventCallback = (...args: any[]) => void

export class EventManager {
  private events: Record<
    string,
    Array<{ callback: EventCallback; ref: EventRef }>
  > = {}
  private nextId = 0

  public on(event: string, callback: EventCallback): EventRef {
    if (!this.events[event]) {
      this.events[event] = []
    }

    // Create a ref object with a private symbol property to identify it
    const ref: EventRef = {} as EventRef
    // Store private data using a WeakMap or a symbol to avoid exposing it publicly
    ;(ref as any).__id = this.nextId++

    this.events[event].push({ callback, ref })

    return ref
  }

  public off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(
      item => item.callback !== callback
    )
  }

  public offref(ref: EventRef): void {
    // Find and remove the associated listener
    for (const event in this.events) {
      this.events[event] = this.events[event].filter(item => item.ref !== ref)
    }
  }

  public emit(event: string, ...args: any[]): void {
    console.info(`${event}`, args)
    if (!this.events[event]) return
    // Use a copy of the array to prevent issues if handlers remove themselves during emission
    const handlers = [...this.events[event]]
    handlers.forEach(item => {
      item.callback(...args)
    })
  }

  public removeAllListeners(): void {
    this.events = {}
  }
}
