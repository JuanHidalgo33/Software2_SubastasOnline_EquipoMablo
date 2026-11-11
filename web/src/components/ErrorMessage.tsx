import { describeError } from '../api/errors';

export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="error" role="alert">
      {describeError(error)}
    </p>
  );
}