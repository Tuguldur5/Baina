import { z } from 'zod';
import { mn } from '@/lib/i18n/mn';
import { AVATAR_ACCEPTED_MIME_TYPES, AVATAR_MAX_SIZE_BYTES } from '@/lib/constants';

/** Schema for the profile edit form (dashboard). */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, mn.validation.nameMin)
    .max(100, mn.validation.nameMax),
  companyName: z
    .string()
    .trim()
    .max(150, mn.validation.companyNameMax)
    .optional(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[0-9]{8}$/.test(v), mn.validation.phone)
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Avatar file validation — runs on the client before upload and again
 *  server-side on the received File/FormData value. */
export const avatarFileSchema = z
  .instanceof(File, { message: mn.dashboard.profile.avatarInvalid })
  .refine((file) => file.size > 0, mn.dashboard.profile.avatarInvalid)
  .refine(
    (file) => file.size <= AVATAR_MAX_SIZE_BYTES,
    mn.dashboard.profile.avatarInvalid
  )
  .refine(
    (file) =>
      (AVATAR_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type),
    mn.dashboard.profile.avatarInvalid
  );
