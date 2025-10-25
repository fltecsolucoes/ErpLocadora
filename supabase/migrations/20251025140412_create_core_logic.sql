-- 1. TRIGGER: Sincronizar auth.users -> public.profiles
-- OBJETIVO: Quando um novo usuário se cadastra (em auth.users),
-- cria automaticamente um registro correspondente na nossa tabela 'profiles'.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS TRIGGER
LANGUAGE "plpgsql"
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO "public"."profiles" ("id", "email")
  VALUES (NEW."id", NEW."email");
  RETURN NEW;
END;
$$;

-- Criar o trigger que dispara a função acima
CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE PROCEDURE "public"."handle_new_user"();


-- 2. TRIGGER: Atualizar estoque ao receber compra (Req 7)
-- OBJETIVO: Quando um item é adicionado em 'purchase_order_items' (Nota de Compra),
-- atualiza o 'total_quantity' na tabela 'products'.
CREATE OR REPLACE FUNCTION "public"."update_stock_from_purchase"()
RETURNS TRIGGER
LANGUAGE "plpgsql"
AS $$
BEGIN
  UPDATE "public"."products"
  SET "total_quantity" = "total_quantity" + NEW."quantity_received"
  WHERE "id" = NEW."product_id";
  RETURN NEW;
END;
$$;

-- Criar o trigger que dispara a função acima
CREATE TRIGGER "on_purchase_item_received"
AFTER INSERT ON "public"."purchase_order_items"
FOR EACH ROW EXECUTE PROCEDURE "public"."update_stock_from_purchase"();


-- 3. RPC: CÁLCULO DE DISPONIBILIDADE (A MAIS IMPORTANTE) (Req 3, 4)
-- OBJETIVO: Uma função (RPC) que o frontend pode chamar para saber
-- quantos itens de um produto estão livres em um período específico.
CREATE OR REPLACE FUNCTION "public"."get_product_availability"(
  p_product_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS INT
LANGUAGE "plpgsql"
AS $$
DECLARE
  total_stock INT;
  rented_quantity INT;
BEGIN
  -- 1. Obter estoque físico total
  SELECT "total_quantity"
  INTO total_stock
  FROM "public"."products"
  WHERE "id" = p_product_id;

  -- 2. Calcular quantos estão alugados/reservados no período
  -- (Verifica a sobreposição de datas usando o operador '&&')
  SELECT COALESCE(SUM("quantity"), 0)
  INTO rented_quantity
  FROM "public"."order_items"
  WHERE "product_id" = p_product_id
    AND "status" IN ('Reserved', 'CheckedOut') -- Status que remove do pool
    AND (tstzrange("start_date", "end_date", '[]') && tstzrange(p_start_date, p_end_date, '[]'));

  -- 3. Retornar o disponível
  RETURN total_stock - rented_quantity;
END;
$$;


-- 4. RPC: Converter Orçamento em OS (Req 5)
-- OBJETIVO: Uma função (RPC) que o frontend chama para converter
-- um 'quote' (Orçamento) em uma 'order' (OS) automaticamente.
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

  -- 3. Copiar os itens do orçamento para a OS
  INSERT INTO "public"."order_items" ("order_id", "product_id", "quantity", "start_date", "end_date", "status")
  SELECT
    new_order_id,
    "product_id",
    "quantity",
    "start_date",
    "end_date",
    'Reserved' -- Status inicial
  FROM "public"."quote_items"
  WHERE "quote_id" = p_quote_id;

  -- 4. Atualizar o status do orçamento
  UPDATE "public"."quotes"
  SET "status" = 'Converted'
  WHERE "id" = p_quote_id;

  RETURN new_order_id;
END;
$$;