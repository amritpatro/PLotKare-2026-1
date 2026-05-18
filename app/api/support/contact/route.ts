import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { supportMessageSchema } from '@/lib/validation/pilot'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiError, apiOk, parseJson, validationError } from '@/lib/api/response'
import { captureServerEvent } from '@/lib/analytics/server'

export async function POST(request: Request) {
  const parsed = supportMessageSchema.safeParse(await parseJson(request))
  if (!parsed.success) return validationError(parsed.error)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('support_messages')
    .insert({
      owner_id: user?.id ?? null,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      topic: parsed.data.topic,
      message: parsed.data.message,
    })
    .select('*')
    .single()

  if (error) return apiError(error.message, 400, 'SUPPORT_MESSAGE_FAILED')

  const supportEmail = process.env.SUPPORT_EMAIL || 'support@plotkare.in'
  await sendTransactionalEmail({
    to: supportEmail,
    replyTo: parsed.data.email,
    subject: `PlotKare support: ${parsed.data.topic}`,
    html: `<p><strong>${parsed.data.name}</strong> (${parsed.data.email}) wrote:</p><p>${parsed.data.message.replace(/\n/g, '<br />')}</p>`,
    text: `${parsed.data.name} (${parsed.data.email}) wrote:\n\n${parsed.data.message}`,
  })

  await sendTransactionalEmail({
    to: parsed.data.email,
    subject: 'PlotKare received your message',
    html: '<p>Thanks for contacting PlotKare. Our team has received your message and will respond shortly.</p>',
    text: 'Thanks for contacting PlotKare. Our team has received your message and will respond shortly.',
  })

  await captureServerEvent({
    distinctId: user?.id ?? parsed.data.email,
    event: 'support_message_created',
    properties: { topic: parsed.data.topic },
  })

  return apiOk({ message: data }, { status: 201 })
}
