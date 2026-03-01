import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy for Google Maps Street View API to avoid CORS issues
  app.get("/api/streetview", async (req, res) => {
    const { lat, lng, heading, pitch, key } = req.query;
    
    if (!key) {
      res.status(400).send("Missing API key");
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&fov=90&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&key=${key}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        res.status(response.status).send("Error fetching from Google Maps API");
        return;
      }

      const buffer = await response.arrayBuffer();
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Error proxying streetview:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
