import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatSession } from './agentChatHistoryStore'
import {
  groupSessionsByRecency,
  useAgentChatHistoryStore
} from './agentChatHistoryStore'

const NOW = new Date(2026, 2, 15, 12, 0, 0).getTime()
const DAY = 86_400_000

const session = (id: string, updatedAt: number): ChatSession => ({
  id,
  title: id,
  updatedAt,
  workflowId: null,
  createdAt: updatedAt
})

const threadOn = (
  id: string,
  workflowId: string | null,
  createdAt: number
): ChatSession => ({ ...session(id, createdAt), workflowId, createdAt })

describe('groupSessionsByRecency', () => {
  it('buckets by recency, newest first, with the active session as Current', () => {
    const sessions = [
      session('now', NOW - 1_000),
      session('active', NOW - 5 * DAY),
      session('earlyToday', NOW - 6 * 3_600_000),
      session('yesterday', NOW - DAY),
      session('lastWeek', NOW - 4 * DAY)
    ]
    const groups = groupSessionsByRecency(sessions, 'active', NOW)

    expect(groups.current.map((s) => s.id)).toEqual(['active'])
    expect(groups.today.map((s) => s.id)).toEqual(['now', 'earlyToday'])
    expect(groups.yesterday.map((s) => s.id)).toEqual(['yesterday'])
    expect(groups.earlier.map((s) => s.id)).toEqual(['lastWeek'])
  })

  it('places everything in earlier when nothing is recent and none is active', () => {
    const groups = groupSessionsByRecency(
      [session('old', NOW - 30 * DAY)],
      null,
      NOW
    )
    expect(groups.current).toHaveLength(0)
    expect(groups.earlier.map((s) => s.id)).toEqual(['old'])
  })

  it('buckets the prior evening as yesterday across a spring-forward midnight', () => {
    const now = new Date(2026, 2, 8, 2, 30).getTime()
    const priorEvening = new Date(2026, 2, 7, 23, 30).getTime()
    const groups = groupSessionsByRecency(
      [session('priorEvening', priorEvening)],
      null,
      now
    )

    expect(groups.yesterday.map((s) => s.id)).toEqual(['priorEvening'])
    expect(groups.earlier).toHaveLength(0)
  })
})

describe('useAgentChatHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('overlays a rename onto the grouped list and titleFor', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([session('a', NOW - 1_000)])
    store.setActive('a')

    store.rename('a', '  Duck pipeline  ')

    expect(store.titleFor('a')).toBe('Duck pipeline')
    expect(store.grouped.current[0]).toMatchObject({
      id: 'a',
      title: 'Duck pipeline'
    })
  })

  it('ignores a whitespace-only rename', () => {
    const store = useAgentChatHistoryStore()
    store.rename('a', '   ')

    expect(store.titleFor('a')).toBeUndefined()
  })

  it('drops the rename override with the session', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([session('a', 1)])
    store.rename('a', 'kept?')

    store.remove('a')

    expect(store.titleFor('a')).toBeUndefined()
  })

  it('holds a removed session out of later refreshes', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([session('a', 1), session('b', 2)])

    store.remove('a')
    store.replaceAll([session('a', 1), session('b', 2)])

    expect(store.sessions.map((s) => s.id)).toEqual(['b'])
  })

  it('clears the active id when the active session is removed', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([session('a', 1)])
    store.setActive('a')
    store.remove('a')

    expect(store.activeId).toBeNull()
    expect(store.sessions).toHaveLength(0)
  })

  it('keeps the active id when a different session is removed', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([session('a', 1), session('b', 2)])
    store.setActive('a')
    store.remove('b')

    expect(store.activeId).toBe('a')
  })

  it('removes a session with no server request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const store = useAgentChatHistoryStore()
    store.replaceAll([session('a', 1)])

    store.remove('a')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(store.sessions).toHaveLength(0)
    fetchSpy.mockRestore()
  })
})

describe('threadIdForWorkflow', () => {
  // The D3 trap. Run attribution must follow the workflow, so a thread the user
  // opened afterwards — even the newest thread in the whole list — must not be
  // credited with a run on a workflow it did not author.
  it('resolves by workflow rather than by whichever thread is newest', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([
      threadOn('authored-wf-1', 'wf-1', NOW - 3 * DAY),
      threadOn('new-chat', null, NOW),
      threadOn('authored-wf-2', 'wf-2', NOW - DAY)
    ])

    expect(store.threadIdForWorkflow('wf-1')).toBe('authored-wf-1')
    expect(store.threadIdForWorkflow('wf-2')).toBe('authored-wf-2')
  })

  // agent_threads.workflow_id is not unique, so several threads can claim one
  // workflow. The earliest originated it; a later one only edited it.
  it('picks the earliest thread when several share a workflow', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([
      threadOn('later', 'wf-1', NOW - DAY),
      threadOn('earliest', 'wf-1', NOW - 5 * DAY),
      threadOn('middle', 'wf-1', NOW - 3 * DAY)
    ])

    expect(store.threadIdForWorkflow('wf-1')).toBe('earliest')
  })

  it('answers null for a workflow no thread is bound to', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([threadOn('a', 'wf-1', NOW)])

    expect(store.threadIdForWorkflow('wf-other')).toBeNull()
  })

  it('answers null before the thread list has loaded', () => {
    expect(useAgentChatHistoryStore().threadIdForWorkflow('wf-1')).toBeNull()
  })

  it('does not match threads carrying no workflow', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([threadOn('unbound', null, NOW)])

    expect(store.threadIdForWorkflow('')).toBeNull()
  })

  // toChatSession maps an absent or unparseable created_at to +Infinity, and
  // created_at is only z.string() on the wire, so an empty stamp validates.
  it('prefers a dated thread over one whose creation time is unknown', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([
      threadOn('undated', 'wf-1', Number.POSITIVE_INFINITY),
      threadOn('dated', 'wf-1', NOW - DAY)
    ])

    expect(store.threadIdForWorkflow('wf-1')).toBe('dated')
  })

  it('still resolves a lone thread whose creation time is unknown', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([threadOn('only', 'wf-1', Number.POSITIVE_INFINITY)])

    expect(store.threadIdForWorkflow('wf-1')).toBe('only')
  })

  // Breaking this tie by list order would credit a conversation for a run it
  // may not have authored — the exact mistake this resolver exists to avoid.
  it('answers null rather than guessing between undated threads', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([
      threadOn('first-in-list', 'wf-1', Number.POSITIVE_INFINITY),
      threadOn('second-in-list', 'wf-1', Number.POSITIVE_INFINITY)
    ])

    expect(store.threadIdForWorkflow('wf-1')).toBeNull()
  })

  it('answers null when two threads share the earliest creation time', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([
      threadOn('tied-a', 'wf-1', NOW - 5 * DAY),
      threadOn('tied-b', 'wf-1', NOW - 5 * DAY),
      threadOn('later', 'wf-1', NOW - DAY)
    ])

    expect(store.threadIdForWorkflow('wf-1')).toBeNull()
  })

  it('ignores a locally deleted thread', () => {
    const store = useAgentChatHistoryStore()
    store.replaceAll([
      threadOn('earliest', 'wf-1', NOW - 5 * DAY),
      threadOn('later', 'wf-1', NOW - DAY)
    ])

    store.remove('earliest')

    expect(store.threadIdForWorkflow('wf-1')).toBe('later')
  })
})
