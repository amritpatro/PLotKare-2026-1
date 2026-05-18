'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Trash2, FileText, Loader2 } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardTopBar } from '@/components/dashboard-topbar'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Document = {
  id: string
  owner_id: string
  plot_id: string | null
  title: string
  bucket: string
  object_path: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  updated_at: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/documents', { method: 'GET' })
        if (!response.ok) {
          toast.error('Failed to load documents')
          setLoading(false)
          return
        }
        const result = await response.json()
        setDocuments(result.data.documents ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error loading documents')
      } finally {
        setLoading(false)
      }
    }

    void fetchDocuments()
  }, [])

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from(doc.bucket)
        .download(doc.object_path)

      if (error) {
        toast.error('Failed to download document')
        return
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.title
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Document downloaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed')
    }
  }

  const deleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"? This action cannot be undone.`)) return

    try {
      const { error: deleteError } = await supabase.storage
        .from(doc.bucket)
        .remove([doc.object_path])

      if (deleteError) {
        toast.error('Failed to delete document from storage')
        return
      }

      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast.error('Failed to delete document metadata')
        return
      }

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast.success('Document deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const response = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result?.error?.message || 'Failed to get upload URL')
      }

      const { data: uploadData } = await response.json()
      const { signedUrl, path } = uploadData.upload

      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload to storage failed')
      }

      const newDoc = uploadData.document as Document
      setDocuments((prev) => [newDoc, ...prev])
      toast.success('Document uploaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <DashboardSidebar />
        <div className="ml-64">
          <DashboardTopBar title="Document Vault" />
          <div className="px-8 pb-12 pt-24">
            <p className="font-sans text-[#6B7280]">Loading documents...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardTopBar title="Document Vault" />
        <div className="px-8 pb-12 pt-24">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#1F2937]">Upload Documents</h2>
                  <p className="mt-1 font-sans text-sm text-[#6B7280]">Store legal documents, property records, and inspection files securely.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-[#C0392B] px-4 py-2.5 font-sans text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {documents.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-[#D1D5DB]" />
                  <p className="mt-4 font-sans text-[#6B7280]">No documents yet. Upload documents to organize and secure your important files.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-[#F9FAFB]">
                      <div className="flex-1">
                        <p className="font-sans font-medium text-[#1F2937]">{doc.title}</p>
                        <p className="mt-1 font-mono text-xs text-[#6B7280]">
                          {formatBytes(doc.size_bytes)} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="rounded-lg border border-[#E5E7EB] px-3 py-2 font-sans text-xs font-medium text-[#1F2937] hover:bg-[#F9FAFB]"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => deleteDocument(doc)}
                          className="rounded-lg border border-[#E5E7EB] px-3 py-2 font-sans text-xs font-medium text-[#DC2626] hover:bg-[#FEE2E2]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
