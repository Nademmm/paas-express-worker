export type Role = "viewer" | "editor" | "admin";

export type AuthContext = {
  userId: number;
  email: string;
  role: Role;
};