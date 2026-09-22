<template>
  <div class="input-slider flex flex-row items-center gap-2">
    <Slider
      :model-value="[modelValue]"
      class="slider-part w-20"
      :min
      :max
      :step
      :disabled
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      v-bind="$attrs"
      @update:model-value="(value) => updateValue(value?.[0] ?? modelValue)"
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
import Slider from '@/components/ui/slider/Slider.vue'
import FormattedNumberStepper from '@/components/ui/stepper/FormattedNumberStepper.vue'

const { modelValue, min, max, step, disabled, ariaLabel, ariaLabelledby } =
  defineProps<{
    modelValue: number
    inputClass?: string
    min?: number
    max?: number
    step?: number
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

defineOptions({
  inheritAttrs: false
})
</script>
