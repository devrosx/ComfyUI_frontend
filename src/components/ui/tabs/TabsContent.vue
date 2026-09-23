<script setup lang="ts">
import type { TabsContentProps } from 'reka-ui'
import { TabsContent, useForwardProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

import { cn } from '@comfyorg/tailwind-utils'

const { class: className, ...restProps } = defineProps<
  TabsContentProps & { class?: HTMLAttributes['class'] }
>()
const forwarded = useForwardProps(restProps)
</script>

<template>
  <TabsContent
    v-bind="forwarded"
    :class="
      cn(
        'outline-none focus-visible:ring-1 focus-visible:ring-border-default',
        className
      )
    "
  >
    <slot />
  </TabsContent>
</template>
