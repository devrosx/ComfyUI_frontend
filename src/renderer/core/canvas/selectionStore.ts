import { isEqual } from 'es-toolkit'
import { defineStore, getActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { reactive } from 'vue'

import type {
  SelectableKey,
  SelectionCommand
} from '@/core/selection/selectionState'
import type {
  GraphScope,
  OwningGraphId,
  RootGraphId
} from '@/types/graphScopeId'

type SelectionRoots = ReadonlyMap<
  RootGraphId,
  ReadonlyMap<OwningGraphId, ReadonlySet<SelectableKey>>
>

export const useSelectionStore = defineStore('selection', () => {
  const roots = reactive(
    new Map<RootGraphId, Map<OwningGraphId, Set<SelectableKey>>>()
  )

  function apply(scope: GraphScope, command: SelectionCommand): void {
    const owners = roots.get(scope.rootGraphId)
    const current = owners?.get(scope.owningGraphId)
    let next: Set<SelectableKey>
    switch (command.type) {
      case 'selection.add':
        if (current) {
          current.add(command.key)
          return
        }
        next = new Set([command.key])
        break
      case 'selection.remove':
        current?.delete(command.key)
        return
      case 'selection.clear':
        current?.clear()
        return
      case 'selection.replace':
        next = new Set(command.keys)
        if (isEqual([...(current ?? [])], [...next])) return
        break
    }

    if (owners) owners.set(scope.owningGraphId, next)
    else roots.set(scope.rootGraphId, new Map([[scope.owningGraphId, next]]))
  }

  function clearRoot(rootGraphId: RootGraphId): void {
    roots.delete(rootGraphId)
  }

  function selectedKeys(scope: GraphScope): readonly SelectableKey[] {
    return [...(roots.get(scope.rootGraphId)?.get(scope.owningGraphId) ?? [])]
  }

  function isSelected(scope: GraphScope, key: SelectableKey): boolean {
    return (
      roots.get(scope.rootGraphId)?.get(scope.owningGraphId)?.has(key) ?? false
    )
  }

  const readonlyRoots: SelectionRoots = roots

  return {
    roots: readonlyRoots,
    apply,
    clearRoot,
    selectedKeys,
    isSelected
  }
})

/**
 * Item `selected` accessors run once per item per frame, so they skip
 * pinia's store lookup and action wrapper: the store instance is memoized per
 * active pinia and membership is read straight from its state.
 */
type SelectionStore = ReturnType<typeof useSelectionStore>

let memoized: { pinia: Pinia | undefined; store: SelectionStore } | undefined

function selectionStore(): SelectionStore {
  const pinia = getActivePinia()
  if (memoized && memoized.pinia === pinia) return memoized.store
  memoized = { pinia, store: useSelectionStore() }
  return memoized.store
}

/** Backs an item's `selected` accessor. An item outside any graph is never selected. */
export function isSelectedIn(
  scope: GraphScope | undefined,
  key: SelectableKey
): boolean {
  return (
    scope !== undefined &&
    (selectionStore()
      .roots.get(scope.rootGraphId)
      ?.get(scope.owningGraphId)
      ?.has(key) ??
      false)
  )
}

/** Backs an item's `selected` setter. Writes for an item outside any graph are dropped. */
export function setSelectedIn(
  scope: GraphScope | undefined,
  key: SelectableKey,
  selected: boolean
): void {
  if (!scope) return
  selectionStore().apply(scope, {
    type: selected ? 'selection.add' : 'selection.remove',
    key
  })
}
