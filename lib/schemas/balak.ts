import { z } from 'zod';
import { cleanMobile } from '@/lib/format';
import { t } from '@/lib/i18n';

export const balakSchema = z.object({
  full_name_gu: z.string().trim().min(1, t('errors.required')),
  full_name_en: z.string().trim().min(1, t('errors.required')),
  dob: z
    .string()
    .min(1, t('errors.required'))
    .refine((val) => {
      const d = new Date(val);
      return !isNaN(d.getTime()) && d <= new Date();
    }, t('errors.invalidDate')),
  standard_code: z.string().min(1, t('errors.required')),
  medium: z.enum(['gujarati', 'english', 'hindi', 'other'], {
    required_error: t('errors.required'),
  }),
  school_gu: z.string().trim().min(1, t('errors.required')),
  school_en: z.string().trim().min(1, t('errors.required')),
  address_gu: z.string().trim().min(1, t('errors.required')),
  satsang_status: z.enum(['satsangi', 'binsatsangi', 'gunbhavi'], {
    required_error: t('errors.required'),
  }),
  mother_name_gu: z.string().trim().min(1, t('errors.required')),
  mother_mobile: z
    .string()
    .min(1, t('errors.required'))
    .transform(cleanMobile)
    .refine((val) => val.length === 10, t('errors.invalidMobile')),
  father_name_gu: z.string().trim().min(1, t('errors.required')),
  father_mobile: z
    .string()
    .min(1, t('errors.required'))
    .transform(cleanMobile)
    .refine((val) => val.length === 10, t('errors.invalidMobile')),
  sabha_ids: z.array(z.string()).min(1, t('errors.required')),
  primary_sabha_id: z.string().min(1, t('errors.required')),
  photo_path: z.string().nullable().optional(),
});

export type BalakFormValues = z.infer<typeof balakSchema>;
