import { uuid } from 'expo';

export function createSubmissionId(): string {
  return uuid.v4();
}
