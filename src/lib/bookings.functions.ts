import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(8),
  room: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(1000).optional().default(""),
}).refine((d) => d.out > d.in, { message: "Check-out must be after check-in." });

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("booking_requests").insert({
      name: data.name, email: data.email, check_in: data.in, check_out: data.out,
      guests: data.guests, room: data.room, notes: data.notes || null,
    });
    if (error) { console.error(error); throw new Error("Could not save request"); }
    return { ok: true };
  });
