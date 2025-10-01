import express from "express";

const app = express();

// route để UptimeRobot ping
app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

// listen ở cổng 3000
export function keepAlive() {
  app.listen(3000, () => {
    console.log("✅ Server keep-alive is running on port 3000");
  });
}
