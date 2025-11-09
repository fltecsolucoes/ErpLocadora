ALTER TABLE "public"."order_items"
ADD COLUMN "unit_price" NUMERIC(10, 2) NULL; 
-- Adiciona a coluna, permitindo nulos inicialmente
