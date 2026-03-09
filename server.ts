import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { supabase } from "./src/services/supabaseClient";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io

  io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    
    // Enviar estado inicial
    const [orders, tables, inventory, cashSessions, expenses, staff] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('tables').select('*'),
      supabase.from('inventory').select('*'),
      supabase.from('cash_sessions').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('staff').select('*'),
    ]);
    socket.emit("init", { 
      orders: orders.data || [],
      tables: tables.data || [],
      inventory: inventory.data || [], 
      cashSessions: cashSessions.data || [], 
      expenses: expenses.data || [], 
      staff: staff.data || [] 
    });

    // Order/Table events (existing)
    socket.on("order:create", async (order) => {
      const { data, error } = await supabase
        .from('orders')
        .upsert(order)
        .select();
      if (error) console.error(error);
      else io.emit("order:created", data?.[0]);
    });

    socket.on("order:update", async (updatedOrder) => {
      const { data, error } = await supabase
        .from('orders')
        .upsert(updatedOrder)
        .select();
      if (error) console.error(error);
      else io.emit("order:updated", data?.[0]);
    });

    socket.on("table:status_change", async (tableData) => {
      const { data, error } = await supabase
        .from('tables')
        .upsert(tableData)
        .select();
      if (error) console.error(error);
      else io.emit("table:status_updated", data?.[0]);
    });

    // New Module events
    socket.on("inventory:update", async (item) => {
      const { data, error } = await supabase
        .from('inventory')
        .upsert(item)
        .select();
      if (error) console.error(error);
      else io.emit("inventory:updated", data?.[0]);
    });

    socket.on("cash:session_update", async (session) => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .upsert(session)
        .select();
      if (error) console.error(error);
      else io.emit("cash:session_updated", data?.[0]);
    });

    socket.on("finance:expense_update", async (expense) => {
      const { data, error } = await supabase
        .from('expenses')
        .upsert(expense)
        .select();
      if (error) console.error(error);
      else io.emit("finance:expense_updated", data?.[0]);
    });

    socket.on("hr:staff_update", async (member) => {
      const { data, error } = await supabase
        .from('staff')
        .upsert(member)
        .select();
      if (error) console.error(error);
      else io.emit("hr:staff_updated", data?.[0]);
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
