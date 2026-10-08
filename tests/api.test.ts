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

  it("creates leads with normalized optional values and forced NEW status", async () => {
    const response = await request(app).post("/api/leads").send({
      sourceMessageId: "message-perfect", product: "  Desk  ", quantity: 3, material: "   ", budget: 0, status: "CONTACTED",
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({
      sourceMessageId: "message-perfect", product: "Desk", quantity: 3, material: null, budget: 0, status: "NEW",
    }));
  });

  it("allows multiple leads for the same source message", async () => {
    const first = await request(app).post("/api/leads").send({ sourceMessageId: "message-perfect", product: "Desk", quantity: 1 });
    const second = await request(app).post("/api/leads").send({ sourceMessageId: "message-perfect", product: "Chair", quantity: 2 });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
  });

  it("rejects invalid lead payloads without creating records", async () => {
    const invalidPayloads = [
      { sourceMessageId: "missing", product: "Desk", quantity: 1 },
      { sourceMessageId: "message-perfect", product: "   ", quantity: 1 },
      { sourceMessageId: "message-perfect", product: "Desk", quantity: 0 },
      { sourceMessageId: "message-perfect", product: "Desk", quantity: -1 },
      { sourceMessageId: "message-perfect", product: "Desk", quantity: 1.5 },
      { sourceMessageId: "message-perfect", product: "Desk", quantity: 1, material: 5 },
      { sourceMessageId: "message-perfect", product: "Desk", quantity: 1, budget: -1 },
      { sourceMessageId: "message-perfect", product: "Desk", quantity: 1, budget: "NaN" },
    ];
    const count = await prisma.lead.count();
    for (const payload of invalidPayloads) {
      const response = await request(app).post("/api/leads").send(payload);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }
    expect(await prisma.lead.count()).toBe(count);
  });

  it("transitions only NEW leads to CONTACTED and rejects repeated or invalid transitions", async () => {
    const created = await request(app).post("/api/leads").send({ sourceMessageId: "message-perfect", product: "Lamp", quantity: 4 });
    const leadId = created.body.id as string;
    const updated = await request(app).patch(`/api/leads/${leadId}/status`).send({ status: "CONTACTED" });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual(expect.objectContaining({ id: leadId, status: "CONTACTED" }));
    expect(updated.body).not.toHaveProperty("lead");
    expect((await request(app).patch(`/api/leads/${leadId}/status`).send({ status: "CONTACTED" })).status).toBe(404);
    expect((await request(app).patch("/api/leads/unknown/status").send({ status: "CONTACTED" })).status).toBe(404);
    expect((await request(app).patch(`/api/leads/${leadId}/status`).send({ status: "NEW" })).status).toBe(400);
    expect((await request(app).patch(`/api/leads/${leadId}/status`).send({ status: "CONTACTED", extra: true })).status).toBe(400);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: leadId } })).status).toBe("CONTACTED");
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
