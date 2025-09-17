-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.branding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT branding_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  image_url text,
  is_published boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  order_id bigint,
  product jsonb NOT NULL,
  selectedoptions jsonb NOT NULL,
  quantity integer NOT NULL,
  totalprice numeric NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cartitems jsonb NOT NULL,
  totalquantity integer NOT NULL,
  totalprice numeric NOT NULL,
  checkoutdata jsonb,
  created_at timestamp without time zone DEFAULT now(),
  userid uuid,
  status text DEFAULT 'pending'::text,
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.productdescriptions (
  id bigint NOT NULL DEFAULT nextval('productdescriptions_id_seq'::regclass),
  productid bigint NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  CONSTRAINT productdescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT productdescriptions_productid_fkey FOREIGN KEY (productid) REFERENCES public.products(id)
);
CREATE TABLE public.productimages (
  id bigint NOT NULL DEFAULT nextval('productimages_id_seq'::regclass),
  productid bigint NOT NULL,
  url text NOT NULL,
  CONSTRAINT productimages_pkey PRIMARY KEY (id),
  CONSTRAINT productimages_productid_fkey FOREIGN KEY (productid) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  name text NOT NULL,
  ispublished boolean DEFAULT true,
  category text,
  labels ARRAY DEFAULT '{}'::text[],
  price numeric NOT NULL,
  discount numeric,
  tax numeric,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.productvariantoptions (
  id bigint NOT NULL DEFAULT nextval('productvariantoptions_id_seq'::regclass),
  variantid bigint NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL,
  ispublished boolean DEFAULT true,
  isoutofstock boolean DEFAULT false,
  isdefault boolean DEFAULT false,
  CONSTRAINT productvariantoptions_pkey PRIMARY KEY (id),
  CONSTRAINT productvariantoptions_variantid_fkey FOREIGN KEY (variantid) REFERENCES public.productvariants(id)
);
CREATE TABLE public.productvariants (
  id bigint NOT NULL DEFAULT nextval('productvariants_id_seq'::regclass),
  productid bigint NOT NULL,
  name text NOT NULL,
  ispublished boolean DEFAULT true,
  CONSTRAINT productvariants_pkey PRIMARY KEY (id),
  CONSTRAINT productvariants_productid_fkey FOREIGN KEY (productid) REFERENCES public.products(id)
);


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

CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'storeadmin');

-- For identity columns
ALTER TABLE categories ALTER COLUMN id RESTART WITH 6;

-- For serial columns (if using a sequence)
-- Find your sequence name, usually categories_id_seq
ALTER SEQUENCE categories_id_seq RESTART WITH 6;


-- For identity columns
ALTER TABLE products ALTER COLUMN id RESTART WITH 73;

-- For serial columns (if using a sequence)
-- Find your sequence name, usually products_id_seq
ALTER SEQUENCE products_id_seq RESTART WITH 73;

-- For identity columns
ALTER TABLE productvariants ALTER COLUMN id RESTART WITH 70;

-- For serial columns (if using a sequence)
-- Find your sequence name, usually productvariants_id_seq
ALTER SEQUENCE productvariants_id_seq RESTART WITH 70;

-- For identity columns
ALTER TABLE productvariantoptions ALTER COLUMN id RESTART WITH 101;

-- For serial columns (if using a sequence)
-- Find your sequence name, usually productvariantoptions_id_seq
ALTER SEQUENCE productvariantoptions_id_seq RESTART WITH 101;