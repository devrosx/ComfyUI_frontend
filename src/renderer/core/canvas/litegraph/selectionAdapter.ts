import type {
  SelectableKey,
  SelectionCommand
} from '@/core/selection/selectionState'
import {
  parseSelectableKey,
  toSelectableKey
} from '@/core/selection/selectionState'
import type { LGraph } from '@/lib/litegraph/src/LGraph'
import type { LGraphCanvas } from '@/lib/litegraph/src/LGraphCanvas'
import type { Positionable } from '@/lib/litegraph/src/interfaces'
import {
  LGraphGroup,
  LGraphNode,
  Reroute,
  Subgraph
} from '@/lib/litegraph/src/litegraph'
import { SubgraphIONodeBase } from '@/lib/litegraph/src/subgraph/SubgraphIONodeBase'
import type { SubgraphInputNode } from '@/lib/litegraph/src/subgraph/SubgraphInputNode'
import type { SubgraphOutputNode } from '@/lib/litegraph/src/subgraph/SubgraphOutputNode'
import { useSelectionStore } from '@/renderer/core/canvas/selectionStore'
import { graphScopeOf } from '@/types/graphScopeId'
import { toNodeId } from '@/types/nodeId'
import { toRerouteId } from '@/types/rerouteId'

type SelectableItem =
  | LGraphNode
  | LGraphGroup
  | Reroute
  | SubgraphInputNode
  | SubgraphOutputNode

export function selectableKeyOf(item: SelectableItem): SelectableKey
export function selectableKeyOf(item: Positionable): SelectableKey | undefined
export function selectableKeyOf(item: Positionable): SelectableKey | undefined {
  if (item instanceof LGraphNode) return toSelectableKey('node', item.id)
  if (item instanceof LGraphGroup) return toSelectableKey('group', item.id)
  if (item instanceof Reroute) return toSelectableKey('reroute', item.id)
  if (item instanceof SubgraphIONodeBase) return toSelectableKey('io', item.id)
}

export function resolveSelectable(
  graph: LGraph,
  key: SelectableKey
): Positionable | undefined {
  const { kind, id } = parseSelectableKey(key)
  switch (kind) {
    case 'node':
      return graph.getNodeById(toNodeId(id)) ?? undefined
    case 'group':
      return graph._groups.find((group) => String(group.id) === id)
    case 'reroute':
      return graph.getReroute(toRerouteId(Number(id)))
    case 'io':
      if (!(graph instanceof Subgraph)) return undefined
      return [graph.inputNode, graph.outputNode].find(
        (ioNode) => String(ioNode.id) === id
      )
  }
}

export function setCanvasItemSelected(
  canvas: LGraphCanvas,
  item: Positionable,
  selected: boolean
): void {
  const key = selectableKeyOf(item)
  if (!key) return
  applyCanvasSelection(canvas, {
    type: selected ? 'selection.add' : 'selection.remove',
    key
  })
}

/**
 * Adds or removes {@link items} (and, with {@link LGraphCanvas.groupSelectChildren},
 * the children of any groups among them) as one command, then fires the node
 * hooks for every node whose state changed.
 * @returns Whether the selection changed.
 */
export function changeCanvasSelection(
  canvas: LGraphCanvas,
  items: Iterable<Positionable>,
  selected: boolean
): boolean {
  const { graph } = canvas
  if (!graph) return false

  const scope = graphScopeOf(graph)
  const store = useSelectionStore()
  const planned = new Set(store.selectedKeys(scope))
  const before = planned.size
  const nodes: LGraphNode[] = []

  const plan = (item: Positionable): boolean => {
    const key = selectableKeyOf(item)
    if (!key || planned.has(key) === selected) return false
    if (selected) planned.add(key)
    else planned.delete(key)
    return true
  }

  const canDeselect = (item: Positionable): boolean =>
    ownsSelectable(canvas, item) ||
    (item instanceof LGraphNode && graph.nodes.includes(item))

  const visit = (item: Positionable): void => {
    if (selected) {
      if (!ownsSelectable(canvas, item)) return
      if (canvas.selectOnly && !(item instanceof LGraphNode)) return
    } else if (!canDeselect(item)) return
    if (!plan(item)) return

    if (item instanceof LGraphGroup) {
      if (selected) item.recomputeInsideNodes()
      if (canvas.groupSelectChildren) traverseGroupChildren(item, plan, visit)
      return
    }

    if (item instanceof LGraphNode) nodes.push(item)
  }

  for (const item of items) visit(item)
  if (planned.size === before) return false

  store.apply(scope, { type: 'selection.replace', keys: [...planned] })
  for (const node of nodes) {
    if (selected) {
      node.onSelected?.()
      canvas.onNodeSelected?.(node)
    } else {
      node.onDeselected?.()
      canvas.onNodeDeselected?.(node)
    }
  }
  return true
}

/**
 * Iterative traversal of a group's descendants. Calls {@link groupAction} on
 * nested groups and {@link leafAction} on non-group children, always recursing
 * into nested groups regardless of their selection state.
 */
function traverseGroupChildren(
  group: LGraphGroup,
  groupAction: (child: LGraphGroup) => void,
  leafAction: (child: Positionable) => void
): void {
  const stack: Positionable[] = [...group._children]
  while (stack.length > 0) {
    const child = stack.pop()!
    if (child instanceof LGraphGroup) {
      groupAction(child)
      for (const nested of child._children) stack.push(nested)
    } else {
      leafAction(child)
    }
  }
}

export function applyCanvasSelection(
  canvas: LGraphCanvas,
  command: SelectionCommand
): void {
  const { graph } = canvas
  if (!graph) return
  useSelectionStore().apply(graphScopeOf(graph), command)
}

export function isCanvasItemSelected(
  canvas: LGraphCanvas,
  item: Positionable
): boolean {
  const { graph } = canvas
  const key = selectableKeyOf(item)
  return (
    !!graph && !!key && useSelectionStore().isSelected(graphScopeOf(graph), key)
  )
}

export function ownsSelectable(
  canvas: LGraphCanvas,
  item: Positionable
): boolean {
  const { graph } = canvas
  const key = selectableKeyOf(item)
  return !!graph && !!key && resolveSelectable(graph, key) === item
}
