import { useLocalStorage, useTimestamp } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface ChatSession {
  id: string
  title: string
  updatedAt: number
  /** Cloud workflow this thread is bound to, null when it has none. */
  workflowId: string | null
  /** Thread creation time, used to pick the earliest thread on a workflow. */
  createdAt: number
}

export interface HistoryGroups {
  current: ChatSession[]
  today: ChatSession[]
  yesterday: ChatSession[]
  earlier: ChatSession[]
}

function startOfLocalDay(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function groupSessionsByRecency(
  sessions: ChatSession[],
  activeId: string | null,
  now: number
): HistoryGroups {
  const startToday = startOfLocalDay(now)
  const startYesterday = startOfLocalDay(startToday - 1)
  const groups: HistoryGroups = {
    current: [],
    today: [],
    yesterday: [],
    earlier: []
  }
  const ordered = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
  for (const session of ordered) {
    if (session.id === activeId) groups.current.push(session)
    else if (session.updatedAt >= startToday) groups.today.push(session)
    else if (session.updatedAt >= startYesterday) groups.yesterday.push(session)
    else groups.earlier.push(session)
  }
  return groups
}

export const useAgentChatHistoryStore = defineStore('agentChatHistory', () => {
  const sessions = ref<ChatSession[]>([])
  const activeId = ref<string | null>(null)
  const now = useTimestamp({ interval: 60_000 })

  // The server owns thread titles but has no rename or delete endpoint yet
  // (BE-3130), so renames live in a local overlay applied over the server
  // titles and deletes in a local tombstone set filtered out of every refresh.
  const customTitles = useLocalStorage<Partial<Record<string, string>>>(
    'Comfy.Agent.ChatTitles',
    {}
  )
  const deletedIds = useLocalStorage<string[]>('Comfy.Agent.DeletedThreads', [])

  const titled = computed(() =>
    sessions.value.map((session) => {
      const custom = customTitles.value[session.id]
      return custom === undefined ? session : { ...session, title: custom }
    })
  )

  const grouped = computed(() =>
    groupSessionsByRecency(titled.value, activeId.value, now.value)
  )

  function titleFor(id: string | null): string | undefined {
    return id === null ? undefined : customTitles.value[id]
  }

  /**
   * The thread that authored a workflow, resolved from the workflow itself
   * rather than from whichever thread is currently open — a run on workflow W
   * belongs to the conversation that built W even when the user has since
   * started a new chat.
   *
   * A workflow can carry several threads (the server does not make
   * agent_threads.workflow_id unique), so the earliest-created one wins: a
   * later thread that also touched the workflow did not originate it.
   *
   * An earliest that is not unique answers null rather than guessing.
   * `toChatSession` maps an absent or unparseable `created_at` to +Infinity so
   * that a thread of unknown age never outranks a dated one — but that also
   * ties every undated thread with every other, and `created_at` is only
   * `z.string()` on the wire, so an empty stamp passes validation. Breaking
   * such a tie by list order would credit a conversation for a run it may not
   * have authored, which is the mistake this whole function exists to avoid.
   */
  function threadIdForWorkflow(workflowId: string): string | null {
    const candidates = sessions.value.filter(
      (session) => session.workflowId === workflowId
    )
    const earliest = Math.min(...candidates.map((session) => session.createdAt))
    const tied = candidates.filter((session) => session.createdAt === earliest)
    return tied.length === 1 ? tied[0].id : null
  }

  function rename(id: string, title: string): void {
    const trimmed = title.trim()
    if (trimmed === '') return
    customTitles.value = { ...customTitles.value, [id]: trimmed }
  }

  function remove(id: string): void {
    sessions.value = sessions.value.filter((item) => item.id !== id)
    const { [id]: _removed, ...rest } = customTitles.value
    customTitles.value = rest
    if (!deletedIds.value.includes(id))
      deletedIds.value = [...deletedIds.value, id]
    if (activeId.value === id) activeId.value = null
  }

  function replaceAll(next: ChatSession[]): void {
    sessions.value = next.filter(
      (session) => !deletedIds.value.includes(session.id)
    )
  }

  function setActive(id: string | null): void {
    activeId.value = id
  }

  return {
    sessions,
    activeId,
    grouped,
    titleFor,
    threadIdForWorkflow,
    rename,
    remove,
    replaceAll,
    setActive
  }
})
