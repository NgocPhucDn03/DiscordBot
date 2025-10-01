// server.js
import express from "express";

export function keepAlive() {
  const app = express();

  app.get("/", (req, res) => {
    res.send("Bot is alive!");
  });

  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
}
