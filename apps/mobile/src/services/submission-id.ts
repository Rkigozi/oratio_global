import { uuid } from 'expo-modules-core';

export function createSubmissionId(): string {
  return uuid.v4();
}
