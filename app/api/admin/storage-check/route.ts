import { NextRequest, NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/api/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type MetadataReference = {
  source: string
  id: string
  bucket: string
  objectPath: string
}

function json(requestId: string, body: Record<string, unknown>, status = 200) {
  return NextResponse.json(status >= 400 ? { ...body, requestId } : body, {
    status,
    headers: { 'X-Request-ID': requestId },
  })
}

function extractPaths(value: unknown, paths: string[] = []): string[] {
  if (!value) return paths
  if (Array.isArray(value)) {
    value.forEach((entry) => extractPaths(entry, paths))
    return paths
  }
  if (typeof value !== 'object') return paths

  const record = value as Record<string, unknown>
  if (typeof record.path === 'string') paths.push(record.path)
  Object.values(record).forEach((entry) => extractPaths(entry, paths))
  return paths
}

async function listBucketObjects(bucket: string, prefix = ''): Promise<string[]> {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw error

  const paths: string[] = []
  for (const object of data ?? []) {
    const path = prefix ? `${prefix}/${object.name}` : object.name
    if (object.id) paths.push(path)
    else paths.push(...(await listBucketObjects(bucket, path)))
  }
  return paths
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const cronSecret = process.env.CRON_SECRET
  const isCron = Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`

  if (!isCron) {
    const context = await requireAdminContext()
    if ('response' in context) return json(requestId, { error: 'Access denied' }, 403)
  }

  try {
    const admin = createSupabaseAdminClient()
    const [
      documentResult,
      propertyDocumentResult,
      landOwnerResult,
      sellerResult,
      buyerResult,
      userObjects,
      documentObjects,
      propertyDocumentObjects,
    ] = await Promise.all([
      admin.from('documents').select('id,bucket,object_path,upload_status'),
      admin.from('property_documents').select('id,bucket,object_path,upload_status'),
      admin.from('land_owner_details').select('user_id,documents_submitted'),
      admin.from('plot_seller_details').select('user_id,business_documents'),
      admin.from('plot_buyer_details').select('user_id,kyc_documents'),
      listBucketObjects('user-documents'),
      listBucketObjects('documents'),
      listBucketObjects('property-documents'),
    ])

    const queryError =
      documentResult.error ||
      propertyDocumentResult.error ||
      landOwnerResult.error ||
      sellerResult.error ||
      buyerResult.error
    if (queryError) throw queryError

    const references: MetadataReference[] = [
      ...(documentResult.data ?? []).map((row) => ({
        source: 'documents',
        id: row.id,
        bucket: row.bucket,
        objectPath: row.object_path,
      })),
      ...(propertyDocumentResult.data ?? []).map((row) => ({
        source: 'property_documents',
        id: row.id,
        bucket: row.bucket,
        objectPath: row.object_path,
      })),
    ]

    for (const row of landOwnerResult.data ?? []) {
      extractPaths(row.documents_submitted).forEach((objectPath) =>
        references.push({ source: 'land_owner_details', id: row.user_id, bucket: 'user-documents', objectPath }),
      )
    }
    for (const row of sellerResult.data ?? []) {
      extractPaths(row.business_documents).forEach((objectPath) =>
        references.push({ source: 'plot_seller_details', id: row.user_id, bucket: 'user-documents', objectPath }),
      )
    }
    for (const row of buyerResult.data ?? []) {
      extractPaths(row.kyc_documents).forEach((objectPath) =>
        references.push({ source: 'plot_buyer_details', id: row.user_id, bucket: 'user-documents', objectPath }),
      )
    }

    const objects = new Set([
      ...userObjects.map((path) => `user-documents/${path}`),
      ...documentObjects.map((path) => `documents/${path}`),
      ...propertyDocumentObjects.map((path) => `property-documents/${path}`),
    ])
    const metadataPaths = new Set(references.map((row) => `${row.bucket}/${row.objectPath}`))
    const missingObjects = references.filter((row) => !objects.has(`${row.bucket}/${row.objectPath}`))
    const orphanObjects = Array.from(objects).filter((path) => !metadataPaths.has(path))

    const missingDocumentIds = missingObjects.filter((row) => row.source === 'documents').map((row) => row.id)
    const missingPropertyDocumentIds = missingObjects.filter((row) => row.source === 'property_documents').map((row) => row.id)
    await Promise.all([
      admin.from('documents').update({ upload_status: 'available' }).not('id', 'in', `(${missingDocumentIds.join(',') || '00000000-0000-0000-0000-000000000000'})`),
      admin.from('property_documents').update({ upload_status: 'available' }).not('id', 'in', `(${missingPropertyDocumentIds.join(',') || '00000000-0000-0000-0000-000000000000'})`),
      missingDocumentIds.length ? admin.from('documents').update({ upload_status: 'missing' }).in('id', missingDocumentIds) : Promise.resolve(),
      missingPropertyDocumentIds.length
        ? admin.from('property_documents').update({ upload_status: 'missing' }).in('id', missingPropertyDocumentIds)
        : Promise.resolve(),
    ])

    console.info('Storage integrity check completed', {
      requestId,
      referenceCount: references.length,
      objectCount: objects.size,
      missingObjectCount: missingObjects.length,
      orphanObjectCount: orphanObjects.length,
    })

    return json(requestId, {
      ok: true,
      checkedAt: new Date().toISOString(),
      summary: {
        referenceCount: references.length,
        objectCount: objects.size,
        missingObjectCount: missingObjects.length,
        orphanObjectCount: orphanObjects.length,
      },
      missingObjects,
      orphanObjects,
    })
  } catch (error) {
    console.error('Storage integrity check failed', { requestId, error })
    return json(requestId, { error: 'An error occurred. Please try again.' }, 500)
  }
}
