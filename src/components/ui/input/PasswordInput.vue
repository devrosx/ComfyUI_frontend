<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref } from 'vue'

import { cn } from '@comfyorg/tailwind-utils'

import Button from '@/components/ui/button/Button.vue'
import Input from './Input.vue'

const {
  class: className,
  toggleClass,
  disabled = false
} = defineProps<{
  class?: HTMLAttributes['class']
  toggleClass?: HTMLAttributes['class']
  disabled?: boolean
}>()

const modelValue = defineModel<string>()
const visible = ref(false)

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="relative">
    <Input
      v-model="modelValue"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      :class="cn('pr-10', className)"
      :disabled
    />
    <Button
      type="button"
      variant="muted-textonly"
      size="icon"
      :class="cn('absolute top-1/2 right-1 -translate-y-1/2', toggleClass)"
      :disabled
      :aria-label="$t(visible ? 'auth.hidePassword' : 'auth.showPassword')"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <i
        :class="visible ? 'icon-[lucide--eye-off]' : 'icon-[lucide--eye]'"
        class="size-4"
      />
    </Button>
  </div>
</template>
