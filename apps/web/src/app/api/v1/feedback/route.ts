import {
  createFeedback,
  FEEDBACK_KINDS,
  FEEDBACK_PLATFORMS,
  MAX_FEEDBACK_LENGTH,
} from '@boramarcar/db';
import { z } from 'zod';
import { runAfterResponse } from '@/server/background';
import { emailFeedback } from '@/server/feedback-email';
import { authed, parseJson } from '@/server/http';
import { rateLimit } from '@/server/limits';

const schema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(3).max(MAX_FEEDBACK_LENGTH),
  page: z.string().max(500).nullish(),
  platform: z.enum(FEEDBACK_PLATFORMS).default('web'),
});

/** Feedback do beta (8.4): guarda e avisa quem administra o projeto por e-mail. */
export const POST = authed(
  async ({ req, db, user }) => {
    const body = await parseJson(req, schema);
    await rateLimit(db, user.id, 'feedback');
    const saved = await createFeedback(db, { userId: user.id, ...body });
    runAfterResponse(() =>
      emailFeedback({
        kind: body.kind,
        message: saved.message,
        page: saved.page,
        platform: saved.platform,
        from: { name: user.name, email: user.email },
      }),
    );
    return { feedback: { id: saved.id } };
  },
  { status: 201 },
);
