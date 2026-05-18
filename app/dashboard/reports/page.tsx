'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { CheckCircle2, Download, AlertCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type InspectionReport = {
  id: string
  owner_id: string
  plot_id: string | null
  month: string
  agent_name: string | null
  finding: string
  status: 'Draft' | 'Scheduled' | 'Completed' | 'Action Needed'
  report_file_path: string | null
  inspection_photos?: Array<{ id: string; photo_url: string; caption?: string }>
  created_at: string
  updated_at: string
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<InspectionReport[]>([])
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/inspections', { method: 'GET' })
        if (!response.ok) {
          toast.error('Failed to load inspection reports')
          setLoading(false)
          return
        }
        const result = await response.json()
        setReports(result.data.inspections ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error loading reports')
      } finally {
        setLoading(false)
      }
    }

    void fetchReports()
  }, [])

  const downloadReport = async (report: InspectionReport) => {
    if (!report.report_file_path) {
      toast.info('Report file not available for download')
      return
    }

    try {
      const { data, error } = await supabase.storage
        .from('inspection-reports')
        .download(report.report_file_path)

      if (error) {
        toast.error('Failed to download report')
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `inspection-report-${report.month.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Report downloaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <DashboardSidebar />
        <div className="ml-64">
          <DashboardTopBar title="Inspection Reports" />
          <div className="px-8 pb-12 pt-24">
            <p className="font-sans text-[#6B7280]">Loading reports...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />

      <div className="ml-64">
        <DashboardTopBar title="Inspection Reports" />

        <div className="px-8 pb-12 pt-24">
          {reports.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <p className="font-sans text-[#6B7280]">No inspection reports yet. Once an inspection is scheduled, reports will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        {report.status === 'Completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                        ) : report.status === 'Action Needed' ? (
                          <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-[#D1D5DB]" />
                        )}
                        <span className="font-mono text-xs font-bold text-[#1F2937]">{report.month}</span>
                        <span className="ml-2 font-mono text-xs text-[#6B7280]">{report.status}</span>
                      </div>
                      {report.agent_name && <p className="mb-2 font-sans font-medium text-[#1F2937]">By {report.agent_name}</p>}
                      <p className="mb-4 font-sans text-sm text-[#6B7280]">{report.finding}</p>
                    </div>
                    <div className="flex gap-2">
                      {report.report_file_path ? (
                        <button
                          onClick={() => downloadReport(report)}
                          className="rounded-lg bg-[#FFF1F2] px-3 py-2 font-sans text-xs font-medium text-[#C0392B] hover:bg-[#FFE4E6]"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      ) : null}
                      {report.inspection_photos && report.inspection_photos.length > 0 ? (
                        <button
                          onClick={() => toast.info(`${report.inspection_photos?.length ?? 0} photo(s) available`)}
                          className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 font-sans text-xs font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
                        >
                          View Photos ({report.inspection_photos.length})
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
