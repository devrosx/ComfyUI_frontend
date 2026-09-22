<template>
  <div class="input-knob flex flex-row items-center gap-2">
    <Knob
      :model-value
      :value-template="displayValue"
      class="knob-part w-32"
      :min
      :max
      :step
      :disabled
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      v-bind="$attrs"
      @update:model-value="updateValue"
    />
    <FormattedNumberStepper
      :model-value
      class="input-part"
      :format-options="{ maximumFractionDigits: 3 }"
      :class="inputClass"
      :min
      :max
      :step
      :disabled
      :aria-label
      :aria-labelledby="ariaLabelledby"
      @update:model-value="updateValue"
    />
  </div>
</template>

<script setup lang="ts">
import Knob from 'primevue/knob'

import FormattedNumberStepper from '@/components/ui/stepper/FormattedNumberStepper.vue'

const {
  modelValue,
  min,
  max,
  step,
  resolution,
  disabled,
  ariaLabel,
  ariaLabelledby
} = defineProps<{
  modelValue: number
  inputClass?: string
  min?: number
  max?: number
  step?: number
  resolution?: number
  disabled?: boolean
  ariaLabel?: string
  ariaLabelledby?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const updateValue = (newValue: number | null) => {
  if (newValue === null) {
    newValue = Number(min) || 0
  }

  const minimum = Number(min ?? Number.NEGATIVE_INFINITY)
  const maximum = Number(max ?? Number.POSITIVE_INFINITY)
  const stepAmount = Number(step) || 1

  newValue = Math.max(minimum, Math.min(maximum, newValue))

  newValue = Math.round(newValue / stepAmount) * stepAmount

  emit('update:modelValue', newValue)
}

const displayValue = (value: number): string => {
  updateValue(value)
  const stepString = (step ?? 1).toString()
  const stepResolution = stepString.includes('.')
    ? stepString.split('.')[1].length
    : 0
  return value.toFixed(resolution ?? stepResolution)
}

defineOptions({
  inheritAttrs: false
})
</script>
