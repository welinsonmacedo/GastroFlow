import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

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
  const orders: any[] = [];
  const tables: any[] = [];

  io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    
    // Enviar estado inicial
    socket.emit("init", { orders, tables });

    socket.on("order:create", (order) => {
      orders.push(order);
      io.emit("order:created", order);
    });

    socket.on("order:update", (updatedOrder) => {
      const index = orders.findIndex(o => o.id === updatedOrder.id);
      if (index !== -1) {
        orders[index] = updatedOrder;
        io.emit("order:updated", updatedOrder);
      }
    });

    socket.on("table:status_change", (tableData) => {
      const index = tables.findIndex(t => t.id === tableData.id);
      if (index !== -1) {
        tables[index] = tableData;
      } else {
        tables.push(tableData);
      }
      io.emit("table:status_updated", tableData);
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
