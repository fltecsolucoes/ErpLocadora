-- Migration: Fix Database Logic and RLS
-- Date: 2025-11-16
-- Description: This migration addresses four critical bugs identified during analysis:
-- 1. Adds 'owner_id' to quotes and orders to fix broken RLS policies.
-- 2. Removes incorrect stock calculation logic on order item status change.
-- 3. Implements a robust trigger for purchase order changes (INSERT, UPDATE, DELETE).
-- 4. Adds a stock availability check to the quote-to-order conversion process.

BEGIN;

-- BUG 4: FIX RLS POLICIES BY ADDING 'owner_id'
-- The RLS policies for quotes and orders depended on a non-existent 'owner_id' column.
-- This adds the column to both tables, making the policies effective.
-- New records will automatically be assigned to the user creating them.
ALTER TABLE "public"."quotes"
ADD COLUMN "owner_id" UUID REFERENCES "auth"."users"("id") ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE "public"."orders"
ADD COLUMN "owner_id" UUID REFERENCES "auth"."users"("id") ON DELETE SET NULL DEFAULT auth.uid();

-- Make sure the policies are re-applied or are already in place.
-- The existing migration '20251025210448_create_rls_policies.sql' already creates the correct policies.
-- This change just provides the column they need to work.


-- BUG 1: FIX INCORRECT STOCK CALCULATION
-- The previous logic incorrectly modified 'total_quantity' during checkout/check-in,
-- leading to double-counting and inaccurate availability. The 'get_product_availability'
-- function already handles this correctly by calculating availability on the fly.
DROP TRIGGER IF EXISTS "on_order_item_status_change" ON "public"."order_items";
DROP FUNCTION IF EXISTS "public"."handle_order_item_checkout"();


-- BUG 3: FIX INCOMPLETE PURCHASE ORDER LOGIC
-- The old trigger only handled new item insertions, not updates or deletions,
-- leading to incorrect stock levels if a purchase order was modified.
-- This new function and trigger handles all cases correctly.

-- First, drop the old, incomplete trigger and function.
DROP TRIGGER IF EXISTS "on_purchase_item_received" ON "public"."purchase_order_items";
DROP FUNCTION IF EXISTS "public"."update_stock_from_purchase"();

-- Then, create the new, comprehensive function.
CREATE OR REPLACE FUNCTION "public"."handle_purchase_item_change"()
RETURNS TRIGGER
LANGUAGE "plpgsql"
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Add new quantity to stock
    UPDATE "public"."products"
    SET "total_quantity" = "total_quantity" + NEW."quantity_received"
    WHERE "id" = NEW."product_id";
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Adjust stock based on the change in quantity
    UPDATE "public"."products"
    SET "total_quantity" = "total_quantity" - OLD."quantity_received" + NEW."quantity_received"
    WHERE "id" = NEW."product_id";
  ELSIF (TG_OP = 'DELETE') THEN
    -- Subtract deleted quantity from stock
    UPDATE "public"."products"
    SET "total_quantity" = "total_quantity" - OLD."quantity_received"
    WHERE "id" = OLD."product_id";
  END IF;
  RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$;

-- Finally, create the new trigger to fire on INSERT, UPDATE, or DELETE.
CREATE TRIGGER "on_purchase_item_change"
AFTER INSERT OR UPDATE OR DELETE ON "public"."purchase_order_items"
FOR EACH ROW EXECUTE PROCEDURE "public"."handle_purchase_item_change"();


-- BUG 2: FIX QUOTE CONVERSION WITHOUT STOCK CHECK
-- The 'convert_quote_to_os' function did not check for product availability,
-- allowing for overbooking. This new version adds a stock check loop.
-- It also populates the new 'owner_id' field.

CREATE OR REPLACE FUNCTION "public"."convert_quote_to_os"(
  p_quote_id UUID
)
RETURNS UUID -- Retorna o ID da nova OS criada
LANGUAGE "plpgsql"
AS $$
DECLARE
  new_order_id UUID;
  v_client_id UUID;
  v_quote_owner_id UUID;
  quote_item_record RECORD;
  available_stock INT;
  product_name_var TEXT;
BEGIN
  -- 1. Get quote details (client and owner)
  SELECT "client_id", "owner_id"
  INTO v_client_id, v_quote_owner_id
  FROM "public"."quotes"
  WHERE "id" = p_quote_id;

  -- If quote not found, raise error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento com ID % não encontrado.', p_quote_id;
  END IF;

  -- 2. Check for stock availability for all items in the quote
  FOR quote_item_record IN
    SELECT "product_id", "quantity", "start_date", "end_date"
    FROM "public"."quote_items"
    WHERE "quote_id" = p_quote_id
  LOOP
    -- Get availability using the existing function
    available_stock := "public"."get_product_availability"(
      quote_item_record."product_id",
      quote_item_record."start_date",
      quote_item_record."end_date"
    );

    -- Check if stock is sufficient
    IF available_stock < quote_item_record."quantity" THEN
      SELECT name INTO product_name_var FROM public.products WHERE id = quote_item_record.product_id;
      RAISE EXCEPTION 'Estoque insuficiente para o produto "%" (ID: %). Disponível: %, Solicitado: %',
        product_name_var, quote_item_record."product_id", available_stock, quote_item_record."quantity";
    END IF;
  END LOOP;

  -- 3. If all checks pass, create the new Order
  INSERT INTO "public"."orders" ("quote_id", "client_id", "status", "type", "owner_id")
  VALUES (p_quote_id, v_client_id, 'Reserved', 'Event', v_quote_owner_id)
  RETURNING "id" INTO new_order_id;

  -- 4. Copy items from quote to order
  INSERT INTO "public"."order_items" (
      "order_id",
      "product_id",
      "quantity",
      "start_date",
      "end_date",
      "status",
      "unit_price"
  )
  SELECT
    new_order_id,
    qi."product_id",
    qi."quantity",
    qi."start_date",
    qi."end_date",
    'Reserved',
    qi."unit_price"
  FROM "public"."quote_items" AS qi
  WHERE qi."quote_id" = p_quote_id;

  -- 5. Update quote status
  UPDATE "public"."quotes"
  SET "status" = 'Converted'
  WHERE "id" = p_quote_id;

  RETURN new_order_id;
END;
$$;

COMMIT;
