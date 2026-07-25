import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import ProfileEditor from './ProfileEditor'
import ClaimRequests from './ClaimRequests'
import MediaProposalForm from './MediaProposalForm'

type OwnerVendor = {
  id: string
  slug: string
  business_name: string
  suburb_slug: string | null
  category_slug: string | null
  is_published: boolean
  street_address: string | null
  contact_email: string | null
  phone: string | null
  website: string | null
  description: string | null
}

type RequestStatus = {
  request_type: string
  request_status: string
  safe_operator_reason: string
  next_step: string
  submitted_at: string
  decided_at: string | null
}

type ClaimRequest = {
  claim_request_id: string
  business_name: string
  claim_status: string
  created_at: string
}

type BusinessSubmissionStatus = {
  business_name: string
  submission_status: string
  status_message: string
  next_step: string
  submitted_at: string
}

type MediaProposal = {
  proposal_id: string
  vendor_id: string
  media_kind: string
  proposal_status: string
  alt_text: string
  operator_reason: string | null
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?next=/dashboard')
  }

  const { data: ownerVendorRows } = await supabase.rpc('list_current_owner_vendors')
  const ownedVendors = ownerVendorRows as OwnerVendor[] | null

  const { data: profileChanges } = await supabase.rpc('list_current_owner_profile_changes')
  const { data: requestStatuses } = await supabase.rpc('list_current_owner_request_statuses')
  const { data: claimRequests } = await supabase.rpc('list_current_owner_claim_requests')
  const { data: businessSubmissionStatuses } = await supabase.rpc('list_current_business_submission_statuses')
  const { data: mediaProposalRows } = await supabase.rpc('list_current_owner_media_proposals')
  const ownerRequestStatuses = (requestStatuses ?? []) as RequestStatus[]
  const ownerClaimRequests = (claimRequests ?? []) as ClaimRequest[]
  const privateSubmissionStatuses = (businessSubmissionStatuses ?? []) as BusinessSubmissionStatus[]
  const mediaProposals = (mediaProposalRows ?? []) as MediaProposal[]
  const latestChangeByVendor = new Map<string, (typeof profileChanges)[number]>()
  for (const change of profileChanges ?? []) {
    if (!latestChangeByVendor.has(change.vendor_id)) latestChangeByVendor.set(change.vendor_id, change)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
          <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
          <form action="/auth/signout" method="post">
            <button className="text-sm font-medium underline text-slate-600 hover:text-black">Sign Out</button>
          </form>
        </header>

        {ownerRequestStatuses.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Request status</h2>
              <p className="mt-1 text-sm text-slate-600">Updates appear here even if an email cannot be delivered.</p>
            </div>
            <div className="grid gap-4">
              {ownerRequestStatuses.map((request, index) => (
                <div key={`${request.request_type}-${request.submitted_at}-${index}`} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="font-bold">{request.request_type === 'claim' ? 'Ownership request' : 'Profile change'}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.safe_operator_reason}</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">Next step: {request.next_step}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {privateSubmissionStatuses.length > 0 && (
          <section className="space-y-4">
            <div><h2 className="text-2xl font-bold">Your business submissions</h2><p className="mt-1 text-sm text-slate-600">These are private review updates. They do not publish a listing or assign ownership.</p></div>
            <div className="grid gap-4">{privateSubmissionStatuses.map((request) => <div key={`${request.business_name}-${request.submitted_at}`} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="font-bold">{request.business_name}</p><p className="mt-2 text-sm text-slate-600">{request.status_message}</p><p className="mt-2 text-sm font-medium text-slate-800">Next step: {request.next_step}</p></div>)}</div>
          </section>
        )}

        <ClaimRequests initialRequests={ownerClaimRequests} />

        {/* Owned Businesses */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Businesses</h2>
            <Link href="/claim" className="btn btn-primary text-sm px-4 py-2">
              Claim a Business
            </Link>
          </div>
          
          {!ownedVendors || ownedVendors.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border shadow-sm text-center">
              <p className="text-slate-600 mb-4">You haven&apos;t claimed any businesses yet.</p>
              <Link href="/claim" className="btn btn-outline">Find Your Business</Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {ownedVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{vendor.business_name}</h3>
                        {vendor.is_published ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2 py-0.5 rounded">Published</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Draft</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {vendor.category_slug} in {vendor.suburb_slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/vendor/${vendor.slug}`} className="btn btn-ghost text-sm flex items-center gap-2">
                        <ExternalLink size={16} /> View
                      </Link>
                    </div>
                  </div>
                  
                  <ProfileEditor vendor={vendor} latestChange={latestChangeByVendor.get(vendor.id) ?? null} />
                  <MediaProposalForm vendorId={vendor.id} />
                  {mediaProposals.filter((proposal) => proposal.vendor_id === vendor.id).length > 0 && <div className="border-t border-slate-100 pt-5"><h4 className="font-bold">Image review status</h4><div className="mt-3 space-y-2">{mediaProposals.filter((proposal) => proposal.vendor_id === vendor.id).map((proposal) => <div key={proposal.proposal_id} className="rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold">{proposal.media_kind === 'logo' ? 'Logo' : 'Listing image'}:</span> {proposal.proposal_status.replaceAll('_', ' ')}{proposal.operator_reason && <p className="mt-1 text-slate-600">{proposal.operator_reason}</p>}</div>)}</div></div>}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
