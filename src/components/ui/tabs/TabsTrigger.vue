<script setup lang="ts">
import type { TabsTriggerProps } from 'reka-ui'
import { TabsTrigger, useForwardProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

import { cn } from '@comfyorg/tailwind-utils'

const { class: className, ...restProps } = defineProps<
  TabsTriggerProps & { class?: HTMLAttributes['class'] }
>()
const forwarded = useForwardProps(restProps)
</script>

<template>
  <TabsTrigger
    v-bind="forwarded"
    :class="
      cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap',
        'transition-colors outline-none focus-visible:ring-1 focus-visible:ring-border-default',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-secondary-background data-[state=active]:text-base-foreground',
        className
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
