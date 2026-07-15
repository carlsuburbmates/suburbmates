import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import ProfileEditor from './ProfileEditor'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?next=/dashboard')
  }

  // Fetch owned vendors
  const { data: ownedVendors } = await supabase
    .from('vendors')
    .select('id, business_name, suburb_slug, category_slug, tier, is_published, street_address, contact_email, phone, website, description')
    .eq('owner_id', user.id)

  const { data: profileChanges } = await supabase.rpc('list_current_owner_profile_changes')
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
                        {vendor.tier === 'premium' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">Premium</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {vendor.category_slug} in {vendor.suburb_slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/vendor/${vendor.id}`} className="btn btn-ghost text-sm flex items-center gap-2">
                        <ExternalLink size={16} /> View
                      </Link>
                    </div>
                  </div>
                  
                  <ProfileEditor vendor={vendor} latestChange={latestChangeByVendor.get(vendor.id) ?? null} />
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
