import { z } from 'zod'
import { emailField, nameField } from './auth'

export const CONTACT_TOPICS = [
  { value: 'general', label: 'General question' },
  { value: 'account', label: 'My account or login' },
  { value: 'billing', label: 'Payments and plans' },
  { value: 'technical', label: 'Something isn’t working' }
] as const

export const contactSchema = z.object({
  name: nameField,
  email: emailField,
  topic: z.enum(['general', 'account', 'billing', 'technical'], { error: 'Choose a topic' }),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a bit more (at least 10 characters)')
    .max(2000, 'Message must be 2,000 characters or fewer')
})

