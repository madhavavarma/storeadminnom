-- Branding table
CREATE TABLE public.branding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT branding_pkey PRIMARY KEY (id)
);

-- Categories table
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  image_url text,
  is_published boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  ispublished boolean DEFAULT true,
  category text,
  labels text[] DEFAULT '{}',
  price numeric NOT NULL,
  discount numeric,
  tax numeric
);

-- Product Images table
CREATE TABLE public.productimages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  productid bigint NOT NULL REFERENCES public.products(id),
  url text NOT NULL
);

-- Product Descriptions table
CREATE TABLE public.productdescriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  productid bigint NOT NULL REFERENCES public.products(id),
  title text NOT NULL,
  content text NOT NULL
);

-- Product Variants table
CREATE TABLE public.productvariants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  productid bigint NOT NULL REFERENCES public.products(id),
  name text NOT NULL,
  ispublished boolean DEFAULT true
);

-- Product Variant Options table
CREATE TABLE public.productvariantoptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variantid bigint NOT NULL REFERENCES public.productvariants(id),
  name text NOT NULL,
  price numeric NOT NULL,
  ispublished boolean DEFAULT true,
  isoutofstock boolean DEFAULT false,
  isdefault boolean DEFAULT false
);

-- Orders table
CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cartitems jsonb NOT NULL,
  totalquantity integer NOT NULL,
  totalprice numeric NOT NULL,
  checkoutdata jsonb,
  created_at timestamp without time zone DEFAULT now(),
  userid uuid,
  status text DEFAULT 'pending'
);

-- Order Items table
CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint REFERENCES public.orders(id),
  product jsonb NOT NULL,
  selectedoptions jsonb NOT NULL,
  quantity integer NOT NULL,
  totalprice numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

-- Supabase Storage Policies
-- Allow authenticated users to upload files to this bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'storeadmin');

-- Allow authenticated users to select (read) files in this bucket
CREATE POLICY "Allow authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'storeadmin');

-- Allow authenticated users to delete files in this bucket
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'storeadmin');