import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { BadgeCheck, Camera, ExternalLink, FileText, Phone, Sparkles } from 'lucide-react'
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
  facebook_url: string | null
  instagram_url: string | null
  description: string | null
  trading_hours: string | null
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string }>
}) {
  const query = await searchParams
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?next=/dashboard')
  }

  const { data: ownerVendorRows } = await supabase.rpc('list_current_owner_vendors_with_channels')
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
    <div className="min-h-screen bg-[#f5f7f3] text-slate-900 p-5 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="overflow-hidden rounded-3xl bg-[#073b3a] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">SuburbMates for owners</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Build a useful local profile.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50 sm:text-base">Keep your details accurate, add the story behind your business and propose owner-authorised imagery. Every public change stays reviewed.</p>
            </div>
            <form action="/auth/signout" method="post" className="shrink-0">
              <button className="min-h-11 rounded-xl border border-white/30 px-4 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Sign out</button>
            </form>
          </div>
        </header>

        {query.media === 'submitted' && (
          <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            Your image is private and awaiting operator review. Its review status is shown below.
          </p>
        )}

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
            <div><h2 className="text-2xl font-bold">Your business submissions</h2><p className="mt-1 text-sm text-slate-600">These are private updates about your business-submission review. Listing and ownership outcomes are shown separately on this page.</p></div>
            <div className="grid gap-4">{privateSubmissionStatuses.map((request) => <div key={`${request.business_name}-${request.submitted_at}`} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="font-bold">{request.business_name}</p><p className="mt-2 text-sm text-slate-600">{request.status_message}</p><p className="mt-2 text-sm font-medium text-slate-800">Next step: {submissionNextStep(request)}</p></div>)}</div>
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
                <div key={vendor.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5 sm:p-8">
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
                  
                  <ProfileReadiness vendor={vendor} mediaProposalCount={mediaProposals.filter((proposal) => proposal.vendor_id === vendor.id).length} />
                  <div id={`profile-editor-${vendor.id}`}>
                    <ProfileEditor vendor={vendor} latestChange={latestChangeByVendor.get(vendor.id) ?? null} />
                  </div>
                  <div id={`media-${vendor.id}`}>
                    <MediaProposalForm vendorId={vendor.id} />
                  </div>
                  {mediaProposals.filter((proposal) => proposal.vendor_id === vendor.id).length > 0 && <div className="border-t border-slate-100 pt-5"><h4 className="font-bold">Image review status</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{mediaProposals.filter((proposal) => proposal.vendor_id === vendor.id).map((proposal) => <div key={proposal.proposal_id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-sm"><Image src={`/api/owner/media/${proposal.proposal_id}`} alt={proposal.alt_text} width={640} height={360} unoptimized className="h-36 w-full bg-white object-contain" /><div className="p-3"><span className="font-semibold">{proposal.media_kind === 'logo' ? 'Logo' : 'Listing image'}:</span> {proposal.proposal_status.replaceAll('_', ' ')}{proposal.operator_reason && <p className="mt-1 text-slate-600">{proposal.operator_reason}</p>}</div></div>)}</div></div>}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function ProfileReadiness({ vendor, mediaProposalCount }: { vendor: OwnerVendor; mediaProposalCount: number }) {
  const hasDirectContact = Boolean(vendor.phone || vendor.contact_email || vendor.website)
  const cards = [
    { href: `#profile-editor-${vendor.id}`, Icon: Phone, title: "Direct contact", detail: hasDirectContact ? "A way for locals to contact you is on file." : "Add a phone number, email or website.", complete: hasDirectContact },
    { href: `#profile-editor-${vendor.id}`, Icon: FileText, title: "Business story", detail: vendor.description?.trim() ? "Your public description is ready for review." : "Explain what you do and what makes you useful locally.", complete: Boolean(vendor.description?.trim()) },
    { href: `#media-${vendor.id}`, Icon: Camera, title: "Photos and logo", detail: mediaProposalCount > 0 ? "Your media proposal is visible in its review status below." : "Propose a logo or real business image you are allowed to use.", complete: mediaProposalCount > 0 },
  ]
  return <section className="rounded-2xl border border-teal-900/10 bg-teal-50/70 p-5 sm:p-6" aria-label={`Profile readiness for ${vendor.business_name}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-teal-900"><Sparkles size={15} aria-hidden="true" /> Make this profile more useful</p><p className="mt-2 text-sm leading-6 text-slate-700">These are practical improvements, not paid placement. They help locals decide whether to contact you.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-900 shadow-sm">{cards.filter((card) => card.complete).length} of {cards.length} ready</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3">{cards.map(({ href, Icon, title, detail, complete }) => <a key={title} href={href} className="group min-h-28 rounded-2xl border border-white bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"><div className="flex items-center justify-between gap-3"><Icon size={20} className="text-teal-900" aria-hidden="true" />{complete && <BadgeCheck size={18} className="text-emerald-700" aria-label="Ready" />}</div><h4 className="mt-3 font-black text-slate-950 group-hover:text-teal-900">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></a>)}</div>
  </section>
}

function submissionNextStep(request: BusinessSubmissionStatus) {
  if (request.submission_status === "approved") return "No action is needed. Check Your ownership requests below for ownership status."
  return request.next_step
}
