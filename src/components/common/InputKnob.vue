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
      @update:model-value="(value) => emit('update:modelValue', value)"
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
      @update:model-value="(value) => emit('update:modelValue', value)"
    />
  </div>
</template>

<script setup lang="ts">
import Knob from 'primevue/knob'

import FormattedNumberStepper from '@/components/ui/stepper/FormattedNumberStepper.vue'

const { step, resolution } = defineProps<{
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
  'update:modelValue': [value: number]
}>()

const displayValue = (value: number): string => {
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
