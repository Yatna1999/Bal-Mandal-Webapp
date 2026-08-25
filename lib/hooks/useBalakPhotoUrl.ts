'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useBalakPhotoUrl(photoPath: string | null | undefined) {
  return useQuery({
    queryKey: ['balak-photo-url', photoPath],
    queryFn: async () => {
      if (!photoPath) return null;
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('balak-photos')
        .createSignedUrl(photoPath, 3600);

      if (error || !data) {
        return null;
      }
      return data.signedUrl;
    },
    enabled: !!photoPath,
    staleTime: 50 * 60 * 1000, // 50 minutes cache
  });
}
