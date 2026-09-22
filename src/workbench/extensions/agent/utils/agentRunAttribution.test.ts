import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { useWorkflowStore } from '@/platform/workflow/management/stores/workflowStore'
import { blankGraph } from '@/scripts/defaultGraph'

import type { ChatSession } from '../stores/agent/agentChatHistoryStore'
import { useAgentChatHistoryStore } from '../stores/agent/agentChatHistoryStore'
import { useAgentWorkflowTabBindingStore } from '../stores/agent/agentWorkflowTabBindingStore'
import { getAgentThreadIdForActiveWorkflow } from './agentRunAttribution'

const GRAPH_ID = '3d4d7f1e-3c8b-4a0a-9a3c-1d2e3f4a5b6c'
const NOW = new Date(2026, 2, 15, 12, 0, 0).getTime()
const DAY = 86_400_000

const thread = (
  id: string,
  workflowId: string | null,
  createdAt: number
): ChatSession => ({
  id,
  title: id,
  updatedAt: createdAt,
  workflowId,
  createdAt
})

/**
 * Opens a tab and makes it the active workflow. `openWorkflow` is avoided
 * because it reaches into the litegraph canvas, which unit tests do not build;
 * the store's `activeWorkflow` is the only part this resolver reads.
 */
async function openTab(filename: string) {
  const workflows = useWorkflowStore()
  const tab = workflows.createTemporary(filename, {
    ...blankGraph,
    id: GRAPH_ID
  })
  workflows.openWorkflowsInBackground({ right: [tab.path] })
  // load() returns `this` for an already-loaded tab, so the binding store's
  // instance-identity check still sees the same object.
  workflows.activeWorkflow = await tab.load()
  await nextTick()
  return tab
}

/** Opens a tab, makes it active, and binds it to a cloud workflow id. */
async function openBoundTab(cloudWorkflowId: string, filename: string) {
  const tab = await openTab(filename)
  useAgentWorkflowTabBindingStore().bind(cloudWorkflowId, tab.path)
  await nextTick()
  return tab
}

describe('getAgentThreadIdForActiveWorkflow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('answers null with no active workflow', () => {
    expect(getAgentThreadIdForActiveWorkflow()).toBeNull()
  })

  it('resolves the thread bound to the active workflow', async () => {
    await openBoundTab('wf-1', 'Agent draft.json')
    useAgentChatHistoryStore().replaceAll([thread('t-1', 'wf-1', NOW - DAY)])

    expect(getAgentThreadIdForActiveWorkflow()).toBe('t-1')
  })

  // The trap this function exists for: the run belongs to the conversation that
  // built the open workflow, not to the chat the user has since opened. A read
  // of agentConversationStore.threadId would return 'new-chat' here.
  it('does not follow the currently open chat', async () => {
    await openBoundTab('wf-1', 'Agent draft.json')
    const history = useAgentChatHistoryStore()
    history.replaceAll([
      thread('built-wf-1', 'wf-1', NOW - 3 * DAY),
      thread('new-chat', null, NOW)
    ])
    // The user started a new chat after building wf-1.
    history.setActive('new-chat')

    expect(getAgentThreadIdForActiveWorkflow()).toBe('built-wf-1')
  })

  it('answers null when the active workflow has no agent binding', async () => {
    await openTab('Hand built.json')
    useAgentChatHistoryStore().replaceAll([thread('t-1', 'wf-1', NOW)])

    expect(getAgentThreadIdForActiveWorkflow()).toBeNull()
  })

  it('answers null when no thread is bound to the active workflow', async () => {
    await openBoundTab('wf-1', 'Agent draft.json')
    useAgentChatHistoryStore().replaceAll([thread('t-other', 'wf-2', NOW)])

    expect(getAgentThreadIdForActiveWorkflow()).toBeNull()
  })

  it('answers null before the thread list has loaded', async () => {
    await openBoundTab('wf-1', 'Agent draft.json')

    expect(getAgentThreadIdForActiveWorkflow()).toBeNull()
  })

  // The binding store reads localStorage as it initialises, which throws
  // outright in a browser privacy mode. The run-button payload is built
  // eagerly, so throwing here would drop the whole app:run_button_click event
  // rather than just its thread id.
  it('answers null when storage access throws', async () => {
    await openTab('Agent draft.json')
    // Spy the instance, not Storage.prototype: happy-dom's localStorage does
    // not route through the prototype spy, which would make this test pass
    // whether or not the guard exists.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(() => getAgentThreadIdForActiveWorkflow()).not.toThrow()
    expect(getAgentThreadIdForActiveWorkflow()).toBeNull()
  })
})
