'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import {
  updateProfileSchema,
  avatarFileSchema,
  type UpdateProfileInput,
} from '@/lib/validators/profile';
import {
  updateProfile,
  uploadAvatar,
  removeAvatar,
} from '@/lib/actions/profile';
import { AVATAR_ACCEPTED_MIME_TYPES, AVATAR_MAX_SIZE_BYTES } from '@/lib/constants';
import { mn } from '@/lib/i18n/mn';
import type { Profile } from '@/lib/types/index';

/** "Профайл" dashboard tab: edit info + avatar upload. */
export function ProfileTab({ profile }: { profile: Profile }) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name,
      companyName: profile.companyName ?? '',
      phone: profile.phone ?? '',
    },
  });

  const onSubmit = async (values: UpdateProfileInput) => {
    const result = await updateProfile(values);
    if (result.ok) {
      toast.success(mn.dashboard.profile.success);
    } else {
      toast.error(result.error);
    }
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    // Client-side validation (server re-validates as well).
    const parsed = avatarFileSchema.safeParse(file);
    if (!parsed.success) {
      toast.error(mn.dashboard.profile.avatarInvalid);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    const result = await uploadAvatar(formData);
    setUploading(false);

    if (result.ok) {
      setAvatarUrl(result.data.avatarUrl);
      toast.success(mn.dashboard.profile.avatarSuccess);
    } else {
      toast.error(result.error);
    }
  };

  const onRemoveAvatar = async () => {
    setRemoving(true);
    const result = await removeAvatar();
    setRemoving(false);
    if (result.ok) {
      setAvatarUrl(null);
      toast.success(mn.dashboard.profile.avatarSuccess);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Avatar card */}
      <div className="card flex flex-col items-center gap-4 p-6">
        <Avatar
          src={avatarUrl}
          name={profile.companyName ?? profile.name}
          size="lg"
          className="h-24 w-24 text-2xl"
        />
        <div className="flex flex-col items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_ACCEPTED_MIME_TYPES.join(',')}
            onChange={onFileChange}
            className="sr-only"
            aria-label={mn.dashboard.profile.avatarUpload}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {mn.dashboard.profile.avatarUpload}
          </Button>
          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              loading={removing}
              onClick={onRemoveAvatar}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {mn.dashboard.profile.avatarRemove}
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted">
          {mn.dashboard.profile.avatarHint}
        </p>
      </div>

      {/* Profile form */}
      <div className="card p-6 lg:col-span-2">
        <h2 className="text-lg font-semibold text-text">
          {mn.dashboard.profile.title}
        </h2>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 space-y-4"
          noValidate
        >
          <Input
            label={mn.dashboard.profile.name}
            error={mounted ? errors.name?.message : undefined}
            disabled={isSubmitting}
            {...register('name')}
          />
          {profile.role === 'company' && (
            <Input
              label={mn.dashboard.profile.companyName}
              error={mounted ? errors.companyName?.message : undefined}
              disabled={isSubmitting}
              {...register('companyName')}
            />
          )}
          <Input
            label={mn.dashboard.profile.email}
            value={profile.email ?? ''}
            disabled
            readOnly
            hint={mn.common.optional}
          />
          <Input
            label={`${mn.dashboard.profile.phone} (${mn.common.optional})`}
            inputMode="numeric"
            error={mounted ? errors.phone?.message : undefined}
            disabled={isSubmitting}
            {...register('phone')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              {mn.common.save}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
