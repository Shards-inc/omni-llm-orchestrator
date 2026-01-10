import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import {
  sanitizeQuery,
  validateResponse,
  getSystemPrompt,
  checkRateLimit,
  getUserIdentifier,
  checkCostLimits,
} from "./security";

// Load routing configuration
const routingConfigPath = path.join(process.cwd(), "client/public/routing.yaml");
const modelConfigPath = path.join(process.cwd(), "client/public/config.yaml");

let routingConfig: any = null;
let modelConfig: any = null;

try {
  routingConfig = yaml.load(fs.readFileSync(routingConfigPath, "utf8"));
  modelConfig = yaml.load(fs.readFileSync(modelConfigPath, "utf8"));
} catch (error) {
  console.error("Failed to load routing configuration:", error);
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  orchestrator: router({
    // Classify user intent using Cohere
    classifyIntent: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(5000),
      }))
      .mutation(async ({ input, ctx }) => {
        const { query } = input;

        // Security: Rate limiting
        const userIdentifier = getUserIdentifier(ctx.req);
        checkRateLimit(userIdentifier, 100, 15 * 60 * 1000);

        // Security: Sanitize input
        const sanitizedQuery = sanitizeQuery(query);

        // Security: Check cost limits
        checkCostLimits(sanitizedQuery, 4000);

        if (!process.env.COHERE_API_KEY) {
          return { intent: "general", confidence: 0.5 };
        }

        try {
          const response = await fetch("https://api.cohere.ai/v1/classify", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: [sanitizedQuery],
              examples: [
                { text: "Write a Python function", label: "coding" },
                { text: "Debug this JavaScript error", label: "coding" },
                { text: "Analyze stock market trends", label: "trading" },
                { text: "What's the best trading strategy", label: "trading" },
                { text: "Write an essay about climate change", label: "writing" },
                { text: "Help me draft a blog post", label: "writing" },
                { text: "Tell me a joke", label: "humour" },
                { text: "Make me laugh", label: "humour" },
                { text: "Research quantum computing", label: "research" },
                { text: "What are the latest AI trends", label: "research" },
                { text: "Automate my workflow", label: "automation" },
                { text: "Create a script for task management", label: "automation" },
                { text: "Translate this to Spanish", label: "translation" },
                { text: "How do you say hello in French", label: "translation" },
                { text: "Generate creative story ideas", label: "creativity" },
                { text: "Help me brainstorm", label: "creativity" },
              ],
            }),
          });

          if (!response.ok) {
            return { intent: "general", confidence: 0.5 };
          }

          const data = await response.json();
          const intent = data.classifications[0]?.prediction || "general";
          const confidence = data.classifications[0]?.confidence || 0.5;

          return { intent, confidence };
        } catch (error) {
          console.error("Intent classification error:", error);
          return { intent: "general", confidence: 0.3 };
        }
      }),

    // Get models for a specific intent
    getModelsForIntent: publicProcedure
      .input(z.object({
        intent: z.string(),
      }))
      .query(({ input }) => {
        const { intent } = input;
        
        if (!routingConfig) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Routing configuration not loaded",
          });
        }

        const intentConfig = routingConfig.intents[intent] || routingConfig.intents.general;
        return {
          intent,
          description: intentConfig.description,
          models: intentConfig.models,
        };
      }),

    // Orchestrate query across multiple models
    orchestrate: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(5000),
        intent: z.string().optional(),
        selectedModel: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { query, intent: providedIntent, selectedModel } = input;

        // Security: Rate limiting
        const userIdentifier = getUserIdentifier(ctx.req);
        checkRateLimit(userIdentifier, 100, 15 * 60 * 1000);

        // Security: Sanitize input
        const sanitizedQuery = sanitizeQuery(query);

        // Security: Check cost limits
        checkCostLimits(sanitizedQuery, 4000);

        if (!process.env.OPENROUTER_API_KEY) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "OpenRouter API key not configured",
          });
        }

        // If specific model selected, use that
        if (selectedModel && selectedModel !== "auto") {
          try {
            // Security: Add defensive system prompt
            const systemPrompt = getSystemPrompt("manual");

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://omni-llm-orchestrator.manus.space",
              },
              body: JSON.stringify({
                model: selectedModel,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: sanitizedQuery }
                ],
                max_tokens: 2000,  // Security: Limit output tokens
              }),
            });

            if (!response.ok) {
              throw new Error(`OpenRouter API error: ${response.statusText}`);
            }

            const data = await response.json();
            const rawResponse = data.choices[0]?.message?.content || "No response generated";

            // Security: Validate response for leaks
            const safeResponse = validateResponse(rawResponse);

            return {
              response: safeResponse,
              model: selectedModel,
              intent: "manual",
            };
          } catch (error) {
            console.error("OpenRouter error:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to get response from model",
            });
          }
        }

        // Auto mode: classify intent and use weighted routing
        const intent = providedIntent || "general";

        if (!routingConfig) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Routing configuration not loaded",
          });
        }

        const intentConfig = routingConfig.intents[intent] || routingConfig.intents.general;
        const models = intentConfig.models;

        // Call top model based on weight
        const topModel = models.sort((a: any, b: any) => b.weight - a.weight)[0];

        // Security: Add intent-specific defensive system prompt
        const systemPrompt = getSystemPrompt(intent);

        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://omni-llm-orchestrator.manus.space",
            },
            body: JSON.stringify({
              model: topModel.id,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: sanitizedQuery }
              ],
              max_tokens: 2000,  // Security: Limit output tokens
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
          }

          const data = await response.json();
          const rawResponse = data.choices[0]?.message?.content || "No response generated";

          // Security: Validate response for leaks
          const safeResponse = validateResponse(rawResponse);

          return {
            response: safeResponse,
            model: topModel.id,
            intent,
            synthesis: {
              modelsUsed: [{
                model: topModel.id,
                weight: topModel.weight,
                rationale: topModel.rationale,
              }],
              totalWeight: topModel.weight,
            },
          };
        } catch (error) {
          console.error("Orchestration error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to orchestrate response",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
