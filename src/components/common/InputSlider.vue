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
      @update:model-value="
        (value) => value && emit('update:modelValue', value[0])
      "
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
import Slider from '@/components/ui/slider/Slider.vue'
import FormattedNumberStepper from '@/components/ui/stepper/FormattedNumberStepper.vue'

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
  'update:modelValue': [value: number]
}>()

defineOptions({
  inheritAttrs: false
})
</script>
