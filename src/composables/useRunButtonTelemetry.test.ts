import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTelemetry } from '@/platform/telemetry'

const state = vi.hoisted(() => ({
  executionContext: {
    is_template: false,
    workflow_name: 'Desktop workflow',
    custom_node_count: 2,
    total_node_count: 4,
    subgraph_count: 1,
    has_api_nodes: true,
    api_node_names: ['LoadImage'],
    has_toolkit_nodes: false,
    toolkit_node_names: []
  },
  executionContextError: null as Error | null,
  agentPanelOpen: false
}))

vi.mock(import('@/platform/telemetry'))

vi.mock<unknown>(
  import('@/platform/telemetry/utils/getExecutionContext'),
  () => ({
    getExecutionContext: () => {
      if (state.executionContextError) throw state.executionContextError
      return state.executionContext
    }
  })
)

vi.mock<unknown>(
  import('@/platform/telemetry/utils/getAgentPanelOpen'),
  () => ({
    getAgentPanelOpen: () => state.agentPanelOpen
  })
)

import { nextTick } from 'vue'

import { useWorkflowStore } from '@/platform/workflow/management/stores/workflowStore'
import { blankGraph } from '@/scripts/defaultGraph'
import { useAgentChatHistoryStore } from '@/workbench/extensions/agent/stores/agent/agentChatHistoryStore'
import { useAgentWorkflowTabBindingStore } from '@/workbench/extensions/agent/stores/agent/agentWorkflowTabBindingStore'

import {
  getRunButtonTelemetryProperties,
  useRunButtonTelemetry
} from './useRunButtonTelemetry'

describe('useRunButtonTelemetry', () => {
  beforeEach(() => {
    state.executionContextError = null
    state.agentPanelOpen = false
  })

  it('builds run button properties from workspace state', () => {
    localStorage.setItem('Comfy.MenuPosition.Docked', 'false')

    expect(
      getRunButtonTelemetryProperties({
        subscribe_to_run: true,
        trigger_source: 'button'
      })
    ).toEqual({
      subscribe_to_run: true,
      workflow_type: 'custom',
      workflow_name: 'Desktop workflow',
      custom_node_count: 2,
      total_node_count: 4,
      subgraph_count: 1,
      has_api_nodes: true,
      api_node_names: ['LoadImage'],
      has_toolkit_nodes: false,
      toolkit_node_names: [],
      trigger_source: 'button',
      view_mode: 'graph',
      is_app_mode: false,
      dock_state: 'floating',
      agent_panel_open: false,
      agent_thread_id: null
    })
  })

  // Proves the wiring, not just the field's presence: the resolver's own
  // workflow-vs-current-thread behaviour is covered in agentRunAttribution.test.
  it('carries the thread that authored the active workflow', async () => {
    const workflows = useWorkflowStore()
    const tab = workflows.createTemporary('Agent draft.json', {
      ...blankGraph,
      id: '3d4d7f1e-3c8b-4a0a-9a3c-1d2e3f4a5b6c'
    })
    workflows.openWorkflowsInBackground({ right: [tab.path] })
    workflows.activeWorkflow = await tab.load()
    useAgentWorkflowTabBindingStore().bind('wf-1', tab.path)
    useAgentChatHistoryStore().replaceAll([
      {
        id: 'thread-1',
        title: 'build a duck',
        updatedAt: 1,
        workflowId: 'wf-1',
        createdAt: 1
      }
    ])
    await nextTick()

    expect(getRunButtonTelemetryProperties()).toMatchObject({
      agent_thread_id: 'thread-1'
    })
  })

  it('reports the agent panel as open when it is open at submit time', () => {
    state.agentPanelOpen = true

    expect(getRunButtonTelemetryProperties()).toMatchObject({
      agent_panel_open: true
    })
  })

  it('tracks the completed run button payload', () => {
    useRunButtonTelemetry().trackRunButton({ trigger_source: 'linear' })

    expect(useTelemetry()?.trackRunButton).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        subscribe_to_run: false,
        trigger_source: 'linear',
        workflow_name: 'Desktop workflow'
      })
    )
  })

  it('does not throw when run button context collection fails', () => {
    const error = new Error('Context unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    state.executionContextError = error

    try {
      expect(() =>
        useRunButtonTelemetry().trackRunButton({ trigger_source: 'linear' })
      ).not.toThrow()

      expect(useTelemetry()?.trackRunButton).not.toHaveBeenCalled()
      expect(consoleError).toHaveBeenCalledExactlyOnceWith(
        '[Telemetry] Run button tracking failed',
        error
      )
    } finally {
      consoleError.mockRestore()
    }
  })
})
