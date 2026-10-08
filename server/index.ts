import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`InboxIQ listening on http://localhost:${port}`);
});
