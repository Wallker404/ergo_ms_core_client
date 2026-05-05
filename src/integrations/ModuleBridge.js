/**
 * MODULE BRIDGE (frontend) — единый механизм межмодульного взаимодействия.
 *
 * Аналог backend-моста (`src.core.integrations.bridge`): RPC-реестр операций
 * и шина событий с строковыми именами. Используется как singleton.
 *
 * Публичный API:
 *
 *   bridge.provide(name, handler, { override })
 *   bridge.has(name) -> boolean
 *   bridge.call(name, ...args) -> any | Promise<any>
 *   bridge.unregister(name)
 *
 *   bridge.provideMany(group, key, obj)
 *   bridge.all(group) -> { [key]: obj }
 *   bridge.unregisterMany(group, key)
 *
 *   bridge.subscribe(event, handler)
 *   bridge.emit(event, payload) -> any[]
 *   bridge.emitFirst(event, payload) -> any | null
 *   bridge.unsubscribe(event, handler)
 *
 *   bridge.reset()                          // для тестов
 *
 * Поддерживается извлечение `default` из последнего аргумента: если последний
 * аргумент — объект вида `{ default: X }` (одно поле), он трактуется как
 * опции вызова, и при отсутствии провайдера возвращается `X`. Это позволяет
 * писать единообразно:
 *
 *   const ok = bridge.call('foo.bar', payload, { default: false })
 *   const list = await bridge.call('foo.search', { q }, { default: [] })
 *
 * При отсутствии провайдера `bridge.call` тихо возвращает default (или null).
 */

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function extractDefault(args) {
  if (!args.length) {
    return [args, undefined]
  }
  const last = args[args.length - 1]
  if (isPlainObject(last) && Object.keys(last).length === 1 && 'default' in last) {
    return [args.slice(0, -1), last.default]
  }
  return [args, undefined]
}

class ModuleBridge {
  constructor() {
    this._handlers = new Map()
    this._groups = new Map()
    this._subscribers = new Map()
  }

  provide(name, handler, { override = false } = {}) {
    if (!name) {
      throw new Error('[ModuleBridge] operation name is required')
    }
    if (typeof handler !== 'function') {
      throw new TypeError(`[ModuleBridge] handler for '${name}' must be a function`)
    }
    if (this._handlers.has(name) && !override) {
      console.warn(`[ModuleBridge] operation '${name}' is already provided; ignored`)
      return
    }
    this._handlers.set(name, handler)
  }

  has(name) {
    return this._handlers.has(name)
  }

  call(name, ...args) {
    const [actualArgs, defaultValue] = extractDefault(args)
    const handler = this._handlers.get(name)
    if (!handler) {
      return defaultValue ?? null
    }
    try {
      return handler(...actualArgs)
    } catch (error) {
      console.error(`[ModuleBridge] error calling '${name}':`, error)
      return defaultValue ?? null
    }
  }

  unregister(name) {
    this._handlers.delete(name)
  }

  provideMany(group, key, obj) {
    if (!group) {
      throw new Error('[ModuleBridge] group name is required')
    }
    if (!key) {
      throw new Error('[ModuleBridge] provider key is required')
    }
    if (!this._groups.has(group)) {
      this._groups.set(group, new Map())
    }
    this._groups.get(group).set(key, obj)
  }

  all(group) {
    const map = this._groups.get(group)
    if (!map) {
      return {}
    }
    return Object.fromEntries(map)
  }

  unregisterMany(group, key) {
    const map = this._groups.get(group)
    if (!map) {
      return
    }
    map.delete(key)
    if (map.size === 0) {
      this._groups.delete(group)
    }
  }

  subscribe(event, handler) {
    if (!event) {
      throw new Error('[ModuleBridge] event name is required')
    }
    if (typeof handler !== 'function') {
      throw new TypeError(`[ModuleBridge] handler for event '${event}' must be a function`)
    }
    if (!this._subscribers.has(event)) {
      this._subscribers.set(event, [])
    }
    const list = this._subscribers.get(event)
    if (!list.includes(handler)) {
      list.push(handler)
    }
  }

  unsubscribe(event, handler) {
    const list = this._subscribers.get(event)
    if (!list) {
      return
    }
    const idx = list.indexOf(handler)
    if (idx >= 0) {
      list.splice(idx, 1)
    }
    if (list.length === 0) {
      this._subscribers.delete(event)
    }
  }

  emit(event, payload) {
    const list = this._subscribers.get(event)
    if (!list || list.length === 0) {
      return []
    }
    const results = []
    for (const handler of list) {
      try {
        results.push(handler(payload))
      } catch (error) {
        console.error(`[ModuleBridge] subscriber for '${event}' raised:`, error)
        results.push(undefined)
      }
    }
    return results
  }

  emitFirst(event, payload) {
    const list = this._subscribers.get(event)
    if (!list || list.length === 0) {
      return null
    }
    for (const handler of list) {
      try {
        const result = handler(payload)
        if (result !== null && result !== undefined) {
          return result
        }
      } catch (error) {
        console.error(`[ModuleBridge] subscriber for '${event}' raised:`, error)
      }
    }
    return null
  }

  reset() {
    this._handlers.clear()
    this._groups.clear()
    this._subscribers.clear()
  }
}

const bridge = new ModuleBridge()

export { ModuleBridge }
export default bridge
