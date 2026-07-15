-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Suburbs Table
CREATE TABLE IF NOT EXISTS public.suburbs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    postcodes TEXT[] NOT NULL DEFAULT '{}',
    seo_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    seo_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    category_slug TEXT REFERENCES public.categories(slug) ON DELETE RESTRICT,
    suburb_slug TEXT REFERENCES public.suburbs(slug) ON DELETE RESTRICT,
    contact_email TEXT UNIQUE NOT NULL,
    phone TEXT,
    website TEXT,
    description TEXT,
    tier TEXT DEFAULT 'free'::text NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    is_claimed BOOLEAN DEFAULT false NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Emails Queue Table (for Resend Throttling)
CREATE TABLE IF NOT EXISTS public.emails_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Configuration

ALTER TABLE public.suburbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails_queue ENABLE ROW LEVEL SECURITY;

-- Suburbs & Categories Policies: Public Read, Service Role Write
CREATE POLICY "Public read access for suburbs" ON public.suburbs FOR SELECT USING (true);
CREATE POLICY "Public read access for categories" ON public.categories FOR SELECT USING (true);

-- Vendors Policies
CREATE POLICY "Public read access for vendors" ON public.vendors FOR SELECT USING (true);

CREATE POLICY "Vendors can update their own profile" ON public.vendors
    FOR UPDATE USING (auth.uid() = owner_id);

-- Emails Queue Policies (Restricted to Service Role)
-- Service roles bypass RLS by default, so we don't need explicit policies for them to insert/update. 
-- The lack of a policy for authenticated/anon means they are completely locked out from read/write.
