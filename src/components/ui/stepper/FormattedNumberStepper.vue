<template>
  <label
    :for="inputId"
    :class="
      cn(
        'text-secondary-foreground focus-within:ring-secondary-foreground flex h-10 cursor-text items-center rounded-lg bg-secondary-background focus-within:ring-1 hover:bg-secondary-background-hover',
        disabled && 'pointer-events-none opacity-50'
      )
    "
  >
    <Button
      type="button"
      variant="muted-textonly"
      size="unset"
      class="h-full w-6 shrink-0 rounded-l-lg focus-visible:ring-inset disabled:opacity-30"
      :disabled="disabled || modelValue === null || modelValue <= min"
      :aria-label="$t('g.decrement')"
      @click="handleStep(-1)"
    >
      <i class="icon-[lucide--minus] size-4" />
    </Button>
    <div
      class="flex flex-1 items-center justify-center gap-0.5 overflow-hidden"
    >
      <slot name="prefix" />
      <input
        :id="inputId"
        ref="inputRef"
        v-model="inputValue"
        type="text"
        role="spinbutton"
        inputmode="decimal"
        :aria-label="ariaLabel"
        :aria-labelledby="ariaLabelledby"
        :aria-valuenow="modelValue ?? undefined"
        :aria-valuemin="Number.isFinite(min) ? min : undefined"
        :aria-valuemax="Number.isFinite(max) ? max : undefined"
        :style="{ width: `${inputWidth}ch` }"
        class="min-w-0 rounded-sm border-none bg-transparent text-center text-lg font-medium text-base-foreground focus-visible:outline-none"
        :disabled="disabled"
        @input="handleInputChange"
        @blur="handleInputBlur"
        @focus="handleInputFocus"
        @keydown.up.prevent="handleStep(1)"
        @keydown.down.prevent="handleStep(-1)"
      />
      <span v-if="suffix">{{ suffix }}</span>
      <slot name="suffix" />
    </div>
    <Button
      type="button"
      variant="muted-textonly"
      size="unset"
      class="h-full w-6 shrink-0 rounded-r-lg focus-visible:ring-inset disabled:opacity-30"
      :disabled="disabled || (modelValue !== null && modelValue >= max)"
      :aria-label="$t('g.increment')"
      @click="handleStep(1)"
    >
      <i class="icon-[lucide--plus] size-4" />
    </Button>
  </label>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { cn } from '@comfyorg/tailwind-utils'

import Button from '@/components/ui/button/Button.vue'

import { formatNumberInput } from './formatNumberInput'

const {
  modelValue,
  min = 0,
  max = Infinity,
  step = 1,
  formatOptions = { useGrouping: true },
  suffix,
  ariaLabel,
  ariaLabelledby,
  clampOnInput = true,
  disabled = false
} = defineProps<{
  modelValue: number | null
  min?: number
  max?: number
  step?: number | ((value: number) => number)
  formatOptions?: Intl.NumberFormatOptions
  suffix?: string
  ariaLabel?: string
  ariaLabelledby?: string
  clampOnInput?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'max-reached': []
}>()

const inputId = useId()
const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref(formatNumber(modelValue))
const isDirty = ref(false)

const inputWidth = computed(() =>
  Math.min(Math.max(inputValue.value.length, 1) + 0.5, 9)
)

watch(
  () => modelValue,
  (newValue) => {
    if (document.activeElement !== inputRef.value) {
      inputValue.value = formatNumber(newValue)
    }
  }
)

function formatNumber(num: number | null): string {
  return num?.toLocaleString('en-US', formatOptions) ?? ''
}

function parseFormattedNumber(str: string): number | undefined {
  const cleaned = str.replace(/,/g, '').replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.min(Math.max(value, minVal), maxVal)
}

function getStepAmount(): number {
  return typeof step === 'function' ? step(modelValue ?? min) : step
}

function updateModelValue(value: number) {
  if (value !== modelValue) emit('update:modelValue', value)
}

function handleInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const raw = input.value
  const cursorPos = input.selectionStart ?? raw.length
  const num = parseFormattedNumber(raw)
  isDirty.value = true

  if (num === undefined) {
    inputValue.value = raw
    return
  }

  const clamped = clampOnInput ? clamp(num, min, max) : num
  const wasClamped = clamped !== num

  if (num > max) {
    emit('max-reached')
  }

  updateModelValue(clamped)

  if (!wasClamped && (raw.startsWith('-') || raw.includes('.'))) {
    inputValue.value = raw
    return
  }

  const { formatted, newCursor } = formatNumberInput({
    raw,
    cursor: cursorPos,
    value: clamped,
    formatOptions,
    resetCursor: wasClamped
  })
  inputValue.value = formatted

  requestAnimationFrame(() => {
    inputRef.value?.setSelectionRange(newCursor, newCursor)
  })
}

function handleInputBlur() {
  const parsed = isDirty.value
    ? parseFormattedNumber(inputValue.value)
    : modelValue
  isDirty.value = false
  if (parsed === undefined || parsed === null) {
    inputValue.value = formatNumber(modelValue)
    return
  }
  const clamped = clamp(parsed, min, max)
  updateModelValue(clamped)
  inputValue.value = formatNumber(clamped)
}

function handleInputFocus(e: FocusEvent) {
  isDirty.value = false
  const input = e.target as HTMLInputElement
  const len = input.value.length
  input.setSelectionRange(len, len)
}

function handleStep(direction: 1 | -1) {
  const stepAmount = getStepAmount()
  const currentValue = modelValue ?? 0
  const newValue = clamp(currentValue + stepAmount * direction, min, max)
  updateModelValue(newValue)
  inputValue.value = formatNumber(newValue)
  isDirty.value = false
}
</script>
