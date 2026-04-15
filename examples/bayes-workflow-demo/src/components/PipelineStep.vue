<template>
  <div class="pipeline-step-wrap">
    <button
      class="pipeline-step"
      :class="[`runtime-${step.runtime}`, { active }]"
      @click="$emit('select')"
    >
      <div class="step-number">{{ index + 1 }}</div>
      <div class="step-icon">{{ step.icon }}</div>
      <div class="step-info">
        <div class="step-name">{{ step.label }}</div>
        <div class="step-runtime">{{ step.runtime }}</div>
      </div>
    </button>
    <div v-if="!isLast" class="pipeline-arrow">→</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  step:   { id: string; label: string; runtime: string; icon: string };
  index:  number;
  active: boolean;
  isLast: boolean;
}>();
defineEmits<{ select: [] }>();
</script>
