import Link from 'next/link'
import { Bell, CheckCircle2 } from 'lucide-react'
import { AgentShell } from '@/components/agent/agent-shell'
import { PendingActionButton } from '@/components/forms/pending-action-button'
import { requireFieldAgentPage } from '@/lib/agent/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { markAgentNotificationRead } from './actions'

function formatTime(value: string | null | undefined) {
  if (!value) return 'Just now'
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function AgentNotificationsPage() {
  const agent = await requireFieldAgentPage()
  const supabase = createSupabaseAdminClient()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id,title,message,category,read_at,link_path,metadata,created_at')
    .eq('recipient_id', agent.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = notifications ?? []

  return (
    <AgentShell title="Notifications" subtitle="Inspection assignments, support replies, and field operations alerts.">
      <section className="grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white px-4 py-10 text-center text-sm text-[#6B7280]">
            No notifications yet.
          </div>
        ) : null}
        {rows.map((notification) => {
          const read = Boolean(notification.read_at)
          const metadata = notification.metadata as Record<string, any> | null
          const inspectionHref = metadata?.inspection_id ? `/agent/inspections/${metadata.inspection_id}` : null
          const href = notification.link_path || inspectionHref

          return (
            <article key={notification.id} className={`rounded-xl border p-5 shadow-sm ${read ? 'border-[#E5E7EB] bg-white' : 'border-[#C0392B]/30 bg-[#FFF7F5]'}`}>
              <div className="flex items-start gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${read ? 'bg-[#F3F4F6] text-[#6B7280]' : 'bg-[#C0392B] text-white'}`}>
                  {read ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-lg font-semibold text-[#111827]">{notification.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6B7280]">{notification.message}</p>
                    </div>
                    <span className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                      {notification.category}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[#9CA3AF]">{formatTime(notification.created_at)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {href ? (
                      <Link href={href} className="inline-flex min-h-10 items-center rounded-lg border border-[#C0392B] px-3 text-sm font-semibold text-[#C0392B]">
                        Open
                      </Link>
                    ) : null}
                    {!read ? (
                      <form action={markAgentNotificationRead}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <PendingActionButton pendingText="Marking..." className="min-h-10 rounded-lg bg-[#1F2937] px-3 text-sm font-semibold text-white">
                          Mark read
                        </PendingActionButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </AgentShell>
  )
}
