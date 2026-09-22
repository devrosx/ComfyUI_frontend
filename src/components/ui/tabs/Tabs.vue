<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core'
import type { TabsRootEmits, TabsRootProps } from 'reka-ui'
import { TabsRoot, useForwardPropsEmits } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

import { cn } from '@comfyorg/tailwind-utils'

const props = defineProps<
  // eslint-disable-next-line vue/no-unused-properties -- forwarded to Reka via useForwardPropsEmits
  TabsRootProps & { class?: HTMLAttributes['class'] }
>()
const emits = defineEmits<TabsRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
</script>

<template>
  <TabsRoot
    v-bind="forwarded"
    data-slot="tabs"
    :class="cn('flex flex-col gap-2', props.class)"
  >
    <slot />
  </TabsRoot>
</template>
