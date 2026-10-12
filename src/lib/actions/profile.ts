'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validators/profile';
import {
  AVATAR_ACCEPTED_MIME_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_STORAGE_BUCKET,
} from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';
import type { ActionResult } from '@/lib/types/index';

function firstError(error: { errors: { message: string }[] }): string {
  return error.errors[0]?.message ?? mn.errors.genericText;
}

/** Update the signed-in user's profile (name, company name, phone). */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<ActionResult<{ name: string }>> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error) };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      name: parsed.data.name,
      company_name: parsed.data.companyName || null,
      phone: parsed.data.phone || null,
    })
    .eq('id', user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, data: { name: parsed.data.name } };
}

/**
 * Upload a new avatar to Supabase Storage and set it on the profile.
 * Validates mime (png/jpeg/webp) and size (<=2MB) server-side as well;
 * file names are random UUIDs.
 */
export async function uploadAvatar(
  formData: FormData
): Promise<ActionResult<{ avatarUrl: string }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: mn.dashboard.profile.avatarInvalid };
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return { ok: false, error: mn.dashboard.profile.avatarInvalid };
  }
  if (!(AVATAR_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: mn.dashboard.profile.avatarInvalid };
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, data: { avatarUrl: publicUrl } };
}

/** Remove the avatar (profile image reset to initials fallback). */
export async function removeAvatar(): Promise<ActionResult<{ removed: true }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: mn.errors.unauthorized };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, data: { removed: true } };
}
