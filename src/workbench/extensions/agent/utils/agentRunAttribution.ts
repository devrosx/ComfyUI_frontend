import { useWorkflowStore } from '@/platform/workflow/management/stores/workflowStore'

import { useAgentChatHistoryStore } from '../stores/agent/agentChatHistoryStore'
import { useAgentWorkflowTabBindingStore } from '../stores/agent/agentWorkflowTabBindingStore'

/**
 * The agent conversation that authored the workflow in the active tab, or null.
 *
 * Resolution runs workflow-first — active tab → its bound cloud workflow id →
 * the earliest thread on that workflow — so a run is never attributed to a
 * conversation that merely happens to be open. `agentConversationStore.threadId`
 * would do exactly that: build workflow W in thread A, start a new chat (thread
 * B), hit Run on W, and the run would read as B's.
 *
 * Best-effort and in-session: it answers null when the thread list has not
 * loaded yet, or when the tab carries no agent binding on this browser. The
 * durable answer is derived server-side onto `execution_start` from
 * `workflow_versions.source` and `agent_threads.workflow_id`; this exists so
 * `app:run_button_click`, which has no server-side counterpart, can be joined
 * to a conversation too.
 */
export function getAgentThreadIdForActiveWorkflow(): string | null {
  const activeWorkflow = useWorkflowStore().activeWorkflow
  if (!activeWorkflow) return null

  const bindings = useAgentWorkflowTabBindingStore()
  const cloudWorkflowId = bindings.workflowIdFor(activeWorkflow.path)
  if (
    cloudWorkflowId === undefined ||
    !bindings.matchesWorkflow(cloudWorkflowId, activeWorkflow)
  )
    return null

  return useAgentChatHistoryStore().threadIdForWorkflow(cloudWorkflowId)
}
