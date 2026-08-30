import { z } from "zod";

export const backupVersion = 1;
const isoDate = z.string().datetime({ offset: true });
const feedbackSchema = z.object({ mediaType: z.enum(["movie", "series", "season"]), tmdbId: z.number().int().positive(), rating: z.number().int().min(1).max(5).nullable(), feedback: z.string().nullable(), tags: z.array(z.string()), excluded: z.boolean() });
const followSchema = z.object({ targetType: z.enum(["movie", "series", "person"]), tmdbId: z.number().int().positive(), locale: z.string(), title: z.string(), imagePath: z.string().nullable(), releaseDate: z.string().nullable(), snapshot: z.object({ seasonCount: z.number().int().optional(), creditKeys: z.array(z.string()).optional() }), requestState: z.string().nullable(), createdAt: isoDate });

export const userExportSchema = z.object({
  format: z.literal("cued-user-export"), version: z.literal(backupVersion), exportedAt: isoDate,
  preferences: z.object({ dateFormat: z.enum(["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"]), timeFormat: z.enum(["24h", "12h"]) }),
  tasteProfile: z.object({ onboardingStatus: z.string(), sourceMediaCount: z.number().int(), profile: z.record(z.string(), z.unknown()), generatedAt: isoDate.nullable(), completedAt: isoDate.nullable() }).nullable(),
  feedback: z.array(feedbackSchema), follows: z.array(followSchema),
});

export type UserExport = z.infer<typeof userExportSchema>;
