import { FastifyInstance } from "fastify";
import { z } from "zod";
import { findSources } from "../repositories/sourceRepository";

export async function sourcesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/sources", async (request, reply) => {
    const schema = z.object({
      limit: z.coerce.number().min(1).max(200).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    const parse = schema.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send({ error: "Invalid query params" });
    }
    const sources = await findSources(parse.data.limit, parse.data.offset);
    return { data: sources, total: sources.length };
  });
}
