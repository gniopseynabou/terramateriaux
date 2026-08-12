
-- Allow guest checkout: orders can be created without auth
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Allow guest order items insertion
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Allow anonymous read of orders by order_number for confirmation
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
