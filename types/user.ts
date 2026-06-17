// types/user.ts
export interface UserData {
  surnom: string;
  email: string;
  role?: 'admin' | 'user';
  score?: number;
}