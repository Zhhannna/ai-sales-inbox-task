import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../server/app.js";
import { prisma } from "../server/db.js";

describe("InboxIQ API", () => {
  it("returns exactly the four seed messages as raw Message objects", async () => {
    const response = await request(app).get("/api/messages");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);
    expect(response.body.map((message: { id: string }) => message.id)).toEqual([
      "message-perfect",
      "message-partial",
      "message-failure",
      "message-empty",
    ]);
    expect(response.body[0]).toEqual(expect.objectContaining({ company: "Acme", createdAt: expect.any(String) }));
    expect(response.body[0]).not.toHaveProperty("tags");
  });

  it("returns a raw message detail and no list alias", async () => {
    const detail = await request(app).get("/api/messages/message-perfect");
    const alias = await request(app).get("/api/messages/list");

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe("message-perfect");
    expect(detail.body).not.toHaveProperty("message");
    expect(alias.status).toBe(404);
  });

  it("starts with no leads", async () => {
    const leads = await request(app).get("/api/leads");

    expect(leads.status).toBe(200);
    expect(leads.body).toEqual([]);
    expect(await prisma.lead.count()).toBe(0);
  });

  it("returns a stable error for malformed API JSON", async () => {
    const response = await request(app)
      .post("/api/ai/extract")
      .set("content-type", "application/json")
      .send('{"messageId":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "invalid_json" });
  });

  it("accepts only the strict messageId extraction request", async () => {
    const alias = await request(app).post("/api/ai/extract").send({ id: "message-perfect" });
    const perfect = await request(app).post("/api/ai/extract").send({ messageId: "message-perfect" });

    expect(alias.status).toBe(400);
    expect(perfect.status).toBe(200);
    expect(perfect.body).toEqual({ product: "Desk", quantity: 30, material: "Oak", budget: 50000 });
  });

  it("returns deterministic partial, failure, and empty extraction states", async () => {
    const partial = await request(app).post("/api/ai/extract").send({ messageId: "message-partial" });
    const failure = await request(app).post("/api/ai/extract").send({ messageId: "message-failure" });
    const empty = await request(app).post("/api/ai/extract").send({ messageId: "message-empty" });

    expect(partial.status).toBe(200);
    expect(partial.body).toEqual({ product: "Ergonomic Chair", quantity: null, material: "Black", budget: 12000 });
    expect(failure.status).toBe(500);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({});
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
