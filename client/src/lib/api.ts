
import { apiRequest } from './queryClient';
import type { Profile } from '@shared/schema';

export async function updateProfile(id: number, data: Partial<Profile>): Promise<Profile> {
  return apiRequest('PATCH', `/api/profiles/${id}`, data);
}

export async function getProfile(id: number): Promise<Profile> {
  return apiRequest('GET', `/api/profiles/${id}`);
}
