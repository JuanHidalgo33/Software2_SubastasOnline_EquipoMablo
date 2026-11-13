import { z } from 'zod';

// Validación de FORMATO en el borde de la API (RNF-03).
// Solo revisa que lleguen los campos con el tipo correcto. Las reglas de negocio

const requiredText = (field: string) =>
  z.string({ required_error: `${field} is required.`, invalid_type_error: `${field} must be a text.` })
    .trim()
    .min(1, `${field} cannot be empty.`);

const wholeNumber = (field: string) =>
  z.number({ required_error: `${field} is required.`, invalid_type_error: `${field} must be a number.` });

export const registerUserSchema = z.object({
  name: requiredText('name'),
  email: requiredText('email'),
  password: requiredText('password'),
});

export const loginSchema = z.object({
  email: requiredText('email'),
  password: requiredText('password'),
});

export const publishAuctionSchema = z.object({
  categoryId: requiredText('categoryId'),
  item: z.object(
    {
      name: requiredText('item.name'),
      description: requiredText('item.description'),
      condition: requiredText('item.condition'),
    },
    { required_error: 'item is required.', invalid_type_error: 'item must be an object.' },
  ),
  basePrice: wholeNumber('basePrice'),
  minIncrement: wholeNumber('minIncrement'),
  closesAt: requiredText('closesAt').datetime({ offset: true, message: 'closesAt must be an ISO 8601 date, e.g. 2026-12-01T18:00:00Z.' }),
});

export const placeBidSchema = z.object({
  amount: wholeNumber('amount'),
});

export const listAuctionsQuerySchema = z.object({
  categoryId: z.string().optional(),
  status: z.enum(['OPEN', 'CANCELLED', 'AWARDED', 'UNSOLD', 'DEFAULTED'], {
    errorMap: () => ({ message: 'status must be one of OPEN, CANCELLED, AWARDED, UNSOLD, DEFAULTED.' }),
  }).optional(),
  page: z.coerce.number({ invalid_type_error: 'page must be a number.' }).int('page must be a whole number.').min(1, 'page must be 1 or greater.').optional(),
  pageSize: z.coerce.number({ invalid_type_error: 'pageSize must be a number.' }).int('pageSize must be a whole number.').min(1, 'pageSize must be 1 or greater.').max(100, 'pageSize cannot exceed 100.').optional(),
});

export const paymentNotificationSchema = z.object({
  eventId: requiredText('eventId'),
  paymentOrderId: requiredText('paymentOrderId'),
  result: z.enum(['SUCCESSFUL', 'FAILED'], {
    required_error: 'result is required.',
    invalid_type_error: 'result must be SUCCESSFUL or FAILED.',
  }),
});
