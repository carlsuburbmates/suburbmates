"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Vendor = {
  id: string;
  business_name: string;
  street_address: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
};

export default function ProfileEditor({ vendor }: { vendor: Vendor }) {
  const [businessName, setBusinessName] = useState(vendor.business_name || "");
  const [streetAddress, setStreetAddress] = useState(vendor.street_address || "");
  const [contactEmail, setContactEmail] = useState(vendor.contact_email || "");
  const [phone, setPhone] = useState(vendor.phone || "");
  const [website, setWebsite] = useState(vendor.website || "");
  const [description, setDescription] = useState(vendor.description || "");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.rpc("update_vendor_profile", {
      p_vendor_id: vendor.id,
      p_business_name: businessName,
      p_street_address: streetAddress || null,
      p_contact_email: contactEmail || null,
      p_phone: phone || null,
      p_website: website || null,
      p_description: description || null,
    });

    if (error) {
      setError(error.message || "Failed to update profile.");
    } else {
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 mt-6 border-t border-slate-100 pt-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
          <input 
            type="text" 
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg shadow-sm p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
          <input
            type="text"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg shadow-sm p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg shadow-sm p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg shadow-sm p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <input 
            type="url" 
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg shadow-sm p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" 
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea 
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full border border-slate-300 rounded-lg shadow-sm p-3 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all" 
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary px-8"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
