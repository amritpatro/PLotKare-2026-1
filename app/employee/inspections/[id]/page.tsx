import { InspectionReview } from '@/components/inspections/inspection-review'
import { requirePageRole } from '@/lib/supabase/role-guard'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EmployeeInspectionReviewPage({ params }: PageProps) {
  await requirePageRole(['employee', 'admin'])
  const { id } = await params
  return (
    <div className="px-4 pb-24 pt-24 sm:px-6 md:px-8 md:pb-12">
      <InspectionReview inspectionId={id} readonly backHref="/employee/inspections" />
    </div>
  )
}
