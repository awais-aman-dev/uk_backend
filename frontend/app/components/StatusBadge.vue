<script setup lang="ts">
const props = defineProps<{ status: string }>()

const MAP: Record<string, { label: string; tone: 'go' | 'warn' | 'stop' | 'muted' | 'info' }> = {
  // orders
  pending: { label: 'Awaiting payment', tone: 'warn' },
  paid: { label: 'Paid', tone: 'go' },
  failed: { label: 'Declined', tone: 'stop' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  expired: { label: 'Expired', tone: 'muted' },
  refunded: { label: 'Refunded', tone: 'muted' },
  // subscriptions
  active: { label: 'Active', tone: 'go' },
  ends_soon: { label: 'Ends soon', tone: 'warn' },
  activating: { label: 'Activating', tone: 'info' },
  sub_expired: { label: 'Expired', tone: 'stop' },
  none: { label: 'No plan', tone: 'muted' }
}
const info = computed(() => MAP[props.status] ?? { label: props.status, tone: 'muted' as const })
</script>

<template>
  <span class="badge" :class="`badge--${info.tone}`">{{ info.label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}
.badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.badge--go { background: var(--go-soft); color: var(--go-text); }
.badge--warn { background: var(--warn-soft); color: var(--warn-text); }
.badge--stop { background: var(--stop-soft); color: var(--stop-text); }
.badge--info { background: var(--accent-soft); color: var(--accent); }
.badge--muted { background: rgb(118 118 128 / 0.12); color: var(--muted); }
</style>
