<script setup lang="ts">
import { CONTACT_TOPICS, contactSchema } from '#shared/schemas/contact'

useHead({ title: 'Contact us — 1Theory' })

const route = useRoute()
const user = useAuthUser()
const topicFromUrl = CONTACT_TOPICS.find((t) => t.value === route.query.topic)?.value

const { values, errors, pending, validateField, handleSubmit } = useZodForm(contactSchema, {
  name: user.value?.name ?? '',
  email: user.value?.email ?? '',
  topic: topicFromUrl ?? ('' as 'general'),
  message: topicFromUrl === 'account' ? 'I forgot my password. Could you help me reset it?' : ''
})

const sent = ref(false)
const onSubmit = handleSubmit(async (data) => {
  await $fetch('/api/contact', { method: 'POST', body: data })
  sent.value = true
})

type IconName = 'mail' | 'clock' | 'question'
const channels: { icon: IconName; title: string; text: string; note: string; to?: string }[] = [
  { icon: 'mail', title: 'Email', text: 'help@1theory.demo', note: 'We reply within one working day.' },
  { icon: 'clock', title: 'Support hours', text: 'Mon–Fri, 9am–6pm', note: 'UK time (Europe/London).' },
  { icon: 'question', title: 'Quick answers', text: 'Read the FAQ', note: 'Plans, payments and the test itself.', to: '/#faq' }
]
</script>

<template>
  <div>
    <header class="contact-hero">
      <div class="container">
        <BackButton dark class="contact-hero__back" />
        <p class="eyebrow">Contact</p>
        <h1>We're here to <span class="mark">help.</span></h1>
        <p>Questions about your plan, your account or the theory test? Send us a message.</p>
      </div>
    </header>

    <div class="container contact">
      <aside class="channels">
        <component
          :is="c.to ? 'NuxtLink' : 'div'"
          v-for="c in channels"
          :key="c.title"
          :to="c.to"
          class="channel"
        >
          <span class="channel__icon"><AppIcon :name="c.icon" /></span>
          <div>
            <h2>{{ c.title }}</h2>
            <p class="channel__text">{{ c.text }}</p>
            <p class="channel__note">{{ c.note }}</p>
          </div>
        </component>
      </aside>

      <div class="card">
        <div v-if="sent" class="sent" role="status">
          <span class="sent__icon" aria-hidden="true"><AppIcon name="check" :size="28" /></span>
          <h2>Message sent</h2>
          <p>Thanks, {{ values.name.split(' ')[0] }}. We'll reply to <strong>{{ values.email }}</strong> within one working day.</p>
          <NuxtLink to="/" class="btn">Back to home</NuxtLink>
        </div>

        <form v-else class="form" method="post" novalidate @submit.prevent="onSubmit">
          <h2>Send a message</h2>
          <UiAlert v-if="errors.form">{{ errors.form }}</UiAlert>
          <div class="form__row">
            <UiInput v-model="values.name" label="Your name" autocomplete="name" :error="errors.name" @blur="validateField('name')" />
            <UiInput
              v-model="values.email"
              label="Email"
              type="email"
              inputmode="email"
              autocomplete="email"
              :error="errors.email"
              @blur="validateField('email')"
            />
          </div>
          <UiSelect
            v-model="values.topic"
            label="What's it about?"
            placeholder="Choose a topic"
            :options="CONTACT_TOPICS"
            :error="errors.topic"
            @blur="validateField('topic')"
          />
          <UiTextarea
            v-model="values.message"
            label="Message"
            :maxlength="2000"
            placeholder="Tell us what's going on…"
            :error="errors.message"
            @blur="validateField('message')"
          />
          <UiButton type="submit" variant="primary" size="lg" :loading="pending">
            Send message
          </UiButton>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-hero {
  margin-top: calc(var(--header-h) * -1);
  padding: calc(var(--header-h) + 28px) 0 128px;
  background:
    radial-gradient(600px 300px at 80% 0%, rgb(41 151 255 / 0.35), transparent 70%),
    radial-gradient(500px 300px at 10% 100%, rgb(162 89 255 / 0.3), transparent 70%),
    var(--black);
  color: #f5f5f7;
}
.contact-hero__back { margin-bottom: 28px; }
.contact-hero h1 { font-size: clamp(2.75rem, 7vw, 4.5rem); font-weight: 700; letter-spacing: -0.04em; }
.contact-hero p:last-child { margin-top: 16px; max-width: 560px; font-size: 1.25rem; color: var(--muted-dark); }

.contact { display: grid; gap: 20px; margin-top: -80px; padding-bottom: 96px; }
@media (min-width: 900px) { .contact { grid-template-columns: 1fr 1.6fr; gap: 32px; align-items: start; } }

.channels { display: grid; gap: 12px; }
.channel {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-radius: var(--radius);
  background: var(--card);
  box-shadow: var(--shadow);
  text-decoration: none;
  transition: transform 0.3s var(--ease);
}
a.channel:hover { transform: translateY(-3px); }
.channel__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--accent-soft);
  color: var(--accent);
}
.channel h2 { font-family: var(--font-body); font-size: 0.8125rem; font-weight: 500; letter-spacing: 0; color: var(--muted); }
.channel__text { margin-top: 2px; font-weight: 600; font-size: 1.125rem; }
.channel__note { font-size: 0.875rem; color: var(--muted); }

.card { padding: 24px; border-radius: var(--radius-lg); background: var(--card); box-shadow: var(--shadow-lg); }
@media (min-width: 600px) { .card { padding: 36px; } }
.card h2 { font-size: 1.75rem; }
.form__row { display: grid; gap: 18px; }
@media (min-width: 600px) { .form__row { grid-template-columns: 1fr 1fr; } }
.form .btn { justify-self: start; }

.sent { display: grid; justify-items: start; gap: 14px; }
.sent__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--go);
  color: #fff;
  animation: pop 0.6s var(--spring);
}
@keyframes pop { from { transform: scale(0.4); opacity: 0; } }
</style>
