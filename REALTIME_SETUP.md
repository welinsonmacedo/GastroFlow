
# Configuração de Realtime (Supabase)

Este documento detalha como os painéis de **Garçom**, **Cozinha (KDS)**, **Estoque** e **Caixa** recebem atualizações em tempo real utilizando as *Subscriptions* do Supabase.

## 1. Contexto de Pedidos (`OrderContext.tsx`)

Responsável por sincronizar o **Garçom** e a **Cozinha**.

### Tabelas Monitoradas
*   `orders`: Novos pedidos, atualizações de status (PAGO, CANCELADO).
*   `order_items`: Itens individuais (PENDING -> READY -> DELIVERED).
*   `restaurant_tables`: Status da mesa (LIVRE/OCUPADA), chamados de cliente.
*   `service_calls`: Solicitações de "Chamar Garçom".

### Implementação
```typescript
// context/OrderContext.tsx

useEffect(() => {
    if (tenantId) {
        fetchData();
        const channel = supabase.channel(`orders:${tenantId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                filter: `tenant_id=eq.${tenantId}` // Filtra apenas eventos deste restaurante
            }, (payload) => {
                // Verifica qual tabela mudou para atualizar o estado local
                if (['orders', 'order_items', 'restaurant_tables', 'service_calls'].includes(payload.table)) {
                    fetchData(); // Recarrega os dados para garantir consistência
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
}, [tenantId, fetchData]);
```

---

## 2. Contexto de Estoque (`InventoryContext.tsx`)

Responsável por atualizar os níveis de insumos e produtos em tempo real no **Admin** e bloquear vendas se acabar o estoque.

### Tabelas Monitoradas
*   `inventory_items`: Quantidade disponível, custo médio.
*   `inventory_logs`: Histórico de movimentações (Entradas/Saídas).
*   `inventory_recipes`: Mudanças nas fichas técnicas.
*   `suppliers`: Cadastro de fornecedores.

### Implementação
```typescript
// context/InventoryContext.tsx

useEffect(() => {
    if (!tenantId) return;
    
    fetchData();

    const channel = supabase.channel(`inventory_updates:${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_recipes', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
}, [tenantId, fetchData]);
```

---

## 3. Contexto Financeiro (`FinanceContext.tsx`)

Responsável por atualizar o **Caixa** e o **Dashboard Admin** quando ocorrem vendas ou despesas.

### Tabelas Monitoradas
*   `transactions`: Vendas realizadas (Pix, Dinheiro, Cartão).
*   `expenses`: Contas a pagar, despesas lançadas.
*   `cash_sessions`: Abertura e fechamento de caixa.
*   `cash_movements`: Sangrias e suprimentos.

### Implementação
```typescript
// context/FinanceContext.tsx

useEffect(() => {
    fetchData();
    if (!tenantId) return;
    const channel = supabase.channel(`finance_ctx:${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements', filter: `tenant_id=eq.${tenantId}` }, fetchData)
        .subscribe();
    return () => { supabase.removeChannel(channel); };
}, [tenantId]);
```

---

## 4. Publicação no Banco de Dados

Para que o Supabase envie esses eventos, a "Publicação" deve estar ativa no banco de dados. O arquivo `database/08_automations_triggers.sql` contém o comando necessário:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE 
    orders, 
    order_items, 
    restaurant_tables, 
    service_calls, 
    transactions, 
    inventory_items,
    inventory_logs,
    expenses,
    cash_sessions,
    cash_movements;
```

Sem este comando no banco de dados, o front-end não receberá nenhuma atualização automática.
