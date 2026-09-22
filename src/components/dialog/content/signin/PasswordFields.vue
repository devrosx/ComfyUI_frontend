<template>
  <!-- Password Field -->
  <FormField
    ref="passwordField"
    v-slot="$field"
    name="password"
    class="flex flex-col gap-2"
  >
    <div class="mb-2 flex items-center justify-between">
      <label
        class="text-base font-medium opacity-80"
        for="comfy-org-sign-up-password"
      >
        {{ t('auth.signup.passwordLabel') }}
      </label>
    </div>
    <PasswordInput
      v-bind="$field.props"
      id="comfy-org-sign-up-password"
      autocomplete="new-password"
      :placeholder="t('auth.signup.passwordPlaceholder')"
      :class="fieldClass"
      :aria-invalid="$field.invalid"
      @input="updatePasswordChecks"
    />
    <div v-if="$field.dirty && isPasswordFocused" class="flex flex-col gap-1">
      <PasswordRules
        :password="password"
        :copy="passwordRulesCopy"
        root-class="text-sm"
        list-class="mt-1 space-y-1"
        unmet-class="text-red-500"
      />
    </div>
  </FormField>

  <!-- Confirm Password Field -->
  <FormField v-slot="$field" name="confirmPassword" class="flex flex-col gap-2">
    <label
      class="mb-2 text-base font-medium opacity-80"
      for="comfy-org-sign-up-confirm-password"
    >
      {{ t('auth.login.confirmPasswordLabel') }}
    </label>
    <PasswordInput
      v-bind="$field.props"
      id="comfy-org-sign-up-confirm-password"
      autocomplete="new-password"
      :placeholder="t('auth.login.confirmPasswordPlaceholder')"
      :class="fieldClass"
      :aria-invalid="$field.invalid"
    />
    <small v-if="$field.error" class="text-red-500">{{
      $field.error.message
    }}</small>
  </FormField>
</template>

<script setup lang="ts">
import { FormField } from '@primevue/forms'
import { useFocusWithin } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import type { ComponentPublicInstance, HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'

import PasswordRules from '@comfyorg/account-ui/auth/PasswordRules'
import PasswordInput from '@/components/ui/input/PasswordInput.vue'

const { fieldClass = 'h-10' } = defineProps<{
  fieldClass?: HTMLAttributes['class']
}>()

const { t } = useI18n()
const password = ref('')
const passwordField = useTemplateRef<ComponentPublicInstance>('passwordField')
const { focused: isPasswordFocused } = useFocusWithin(passwordField)

const updatePasswordChecks = (event: Event) => {
  if (event.target instanceof HTMLInputElement) {
    password.value = event.target.value
  }
}

const passwordRulesCopy = computed(() => ({
  requirements: t('validation.password.requirements'),
  length: t('validation.password.minLength'),
  uppercase: t('validation.password.uppercase'),
  lowercase: t('validation.password.lowercase'),
  number: t('validation.password.number'),
  special: t('validation.password.special')
}))
</script>
