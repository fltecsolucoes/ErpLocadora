-- Re-cria a função para incluir unit_price na cópia
CREATE OR REPLACE FUNCTION "public"."convert_quote_to_os"(
  p_quote_id UUID
)
RETURNS UUID -- Retorna o ID da nova OS criada
LANGUAGE "plpgsql"
AS $$
DECLARE
  new_order_id UUID;
  v_client_id UUID;
BEGIN
  -- 1. Obter o cliente do orçamento
  SELECT "client_id"
  INTO v_client_id
  FROM "public"."quotes"
  WHERE "id" = p_quote_id;

  -- 2. Criar a nova Ordem de Serviço (OS)
  INSERT INTO "public"."orders" ("quote_id", "client_id", "status", "type")
  VALUES (p_quote_id, v_client_id, 'Reserved', 'Event')
  RETURNING "id" INTO new_order_id;

  -- 3. Copiar os itens do orçamento para a OS (INCLUINDO unit_price)
  INSERT INTO "public"."order_items" (
      "order_id", 
      "product_id", 
      "quantity", 
      "start_date", 
      "end_date", 
      "status",
      "unit_price" -- Campo adicionado
  )
  SELECT
    new_order_id,
    "product_id",
    "quantity",
    "start_date",
    "end_date",
    'Reserved', -- Status inicial
    "unit_price" -- Copia o preço do orçamento
  FROM "public"."quote_items"
  WHERE "quote_id" = p_quote_id;

  -- 4. Atualizar o status do orçamento
  UPDATE "public"."quotes"
  SET "status" = 'Converted'
  WHERE "id" = p_quote_id;

  RETURN new_order_id;
END;
$$;