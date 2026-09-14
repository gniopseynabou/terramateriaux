-- Migration: Delivery Management and Promotions Engine for TMI
-- Description: Adds tables, RLS policies, storage bucket, and relations for delivery drivers, order assignments, delivery tracking, delivery history, free delivery settings, promotions, and promotion-product mapping.

-- 1. ENUMS FOR DELIVERY AND PROMOTIONS
DO $$ BEGIN
    CREATE TYPE delivery_driver_status AS ENUM ('DISPONIBLE', 'EN_LIVRAISON', 'INDISPONIBLE', 'DESACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM (
        'A_PREPARER',
        'PRETE',
        'AFFECTEE',
        'EN_COURS',
        'LIVREE',
        'ANNULEE',
        'ECHEC',
        'CLIENT_ABSENT',
        'ADRESSE_INCORRECTE',
        'REPORTEE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE promotion_discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE promotion_target_type AS ENUM ('ALL_PRODUCTS', 'CATEGORY', 'SPECIFIC_PRODUCTS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE promotion_status AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. DELIVERY DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    main_zone TEXT,
    status delivery_driver_status NOT NULL DEFAULT 'DISPONIBLE',
    is_active BOOLEAN NOT NULL DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
    driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
    status delivery_status NOT NULL DEFAULT 'A_PREPARER',
    notes TEXT,
    issue_reason TEXT,
    proof_url TEXT,
    proof_type TEXT,
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. DELIVERY HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.delivery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    comment TEXT,
    proof_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. DELIVERY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    free_delivery_min_amount NUMERIC NOT NULL DEFAULT 50000,
    free_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default delivery settings if none exists
INSERT INTO public.delivery_settings (free_delivery_min_amount, free_delivery_enabled)
SELECT 50000, true
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_settings);

-- 6. PROMOTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    discount_type promotion_discount_type NOT NULL DEFAULT 'PERCENTAGE',
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    target_type promotion_target_type NOT NULL DEFAULT 'ALL_PRODUCTS',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status promotion_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PROMOTION PRODUCTS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.promotion_products (
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (promotion_id, product_id)
);

-- 8. EXTEND ORDERS AND ORDER_ITEMS TABLES FOR PROMOTION AND DELIVERY SNAPSHOTS
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS discount_total NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_status delivery_status DEFAULT 'A_PREPARER',
    ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS original_price NUMERIC,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- 9. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_status ON public.delivery_drivers(status, is_active);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON public.deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_delivery_history_delivery_id ON public.delivery_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON public.promotions(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotion_products_promo_prod ON public.promotion_products(promotion_id, product_id);

-- 10. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

-- 11. RLS POLICIES FOR DELIVERY DRIVERS
CREATE POLICY "Admins full access to delivery_drivers"
    ON public.delivery_drivers FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read active drivers"
    ON public.delivery_drivers FOR SELECT
    USING (is_active = true);

-- 12. RLS POLICIES FOR DELIVERIES
CREATE POLICY "Admins full access to deliveries"
    ON public.deliveries FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers view assigned deliveries"
    ON public.deliveries FOR SELECT
    USING (
        driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Drivers update assigned deliveries"
    ON public.deliveries FOR UPDATE
    USING (
        driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Users view own order delivery status"
    ON public.deliveries FOR SELECT
    USING (
        order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    );

-- 13. RLS POLICIES FOR DELIVERY HISTORY
CREATE POLICY "Admins full access to delivery_history"
    ON public.delivery_history FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers insert delivery_history"
    ON public.delivery_history FOR INSERT
    WITH CHECK (
        driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Drivers and Users view relevant delivery_history"
    ON public.delivery_history FOR SELECT
    USING (
        driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
        OR order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
        OR public.has_role(auth.uid(), 'admin')
    );

-- 14. RLS POLICIES FOR DELIVERY SETTINGS
CREATE POLICY "Admins manage delivery_settings"
    ON public.delivery_settings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read delivery_settings"
    ON public.delivery_settings FOR SELECT
    USING (true);

-- 15. RLS POLICIES FOR PROMOTIONS
CREATE POLICY "Admins manage promotions"
    ON public.promotions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public view active promotions"
    ON public.promotions FOR SELECT
    USING (true);

-- 16. RLS POLICIES FOR PROMOTION PRODUCTS
CREATE POLICY "Admins manage promotion_products"
    ON public.promotion_products FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public view promotion_products"
    ON public.promotion_products FOR SELECT
    USING (true);

-- 17. STORAGE BUCKET FOR DELIVERY PROOFS
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public delivery proofs access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'delivery-proofs');

CREATE POLICY "Authenticated users upload delivery proofs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'delivery-proofs'
        AND (auth.role() = 'authenticated')
    );

-- Pre-production hardening: restrict driver data and delivery proofs.
DROP POLICY IF EXISTS "Public read active drivers" ON public.delivery_drivers;
CREATE POLICY "Drivers read own profile" ON public.delivery_drivers
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

UPDATE storage.buckets SET public = false WHERE id = 'delivery-proofs';
DROP POLICY IF EXISTS "Public delivery proofs access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload delivery proofs" ON storage.objects;

CREATE POLICY "Authenticated users upload delivery proofs"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'delivery-proofs'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR (
                (storage.foldername(name))[1] = auth.uid()::text
                AND EXISTS (
                    SELECT 1 FROM public.deliveries d
                    JOIN public.delivery_drivers dd ON dd.id = d.driver_id
                    WHERE dd.user_id = auth.uid()
                      AND d.order_id::text = (storage.foldername(name))[2]
                )
            )
        )
    );

CREATE POLICY "Authorized users read delivery proofs"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'delivery-proofs'
        AND (
            public.has_role(auth.uid(), 'admin')
            OR EXISTS (
                SELECT 1 FROM public.deliveries d
                JOIN public.orders o ON o.id = d.order_id
                LEFT JOIN public.delivery_drivers dd ON dd.id = d.driver_id
                WHERE (dd.user_id = auth.uid() OR o.user_id = auth.uid())
                  AND d.proof_url LIKE '%' || name
            )
        )
    );

CREATE OR REPLACE FUNCTION public.validate_delivery_status_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;
    IF NOT (
        (OLD.status = 'A_PREPARER' AND NEW.status IN ('PRETE', 'AFFECTEE', 'ANNULEE')) OR
        (OLD.status = 'PRETE' AND NEW.status IN ('AFFECTEE', 'ANNULEE')) OR
        (OLD.status = 'AFFECTEE' AND NEW.status IN ('EN_COURS', 'ANNULEE')) OR
        (OLD.status = 'EN_COURS' AND NEW.status IN ('LIVREE', 'ECHEC', 'CLIENT_ABSENT', 'ADRESSE_INCORRECTE', 'REPORTEE', 'ANNULEE')) OR
        (OLD.status = 'REPORTEE' AND NEW.status IN ('AFFECTEE', 'EN_COURS', 'ANNULEE'))
    ) THEN
        RAISE EXCEPTION 'Transition de livraison interdite: % -> %', OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_delivery_status_transition ON public.deliveries;
CREATE TRIGGER trg_validate_delivery_status_transition
    BEFORE UPDATE OF status ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_status_transition();

CREATE OR REPLACE FUNCTION public.sync_order_delivery_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE public.orders
        SET delivery_status = NEW.status, updated_at = now()
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_delivery_status ON public.deliveries;
CREATE TRIGGER trg_sync_order_delivery_status
    AFTER UPDATE OF status ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.sync_order_delivery_status();
