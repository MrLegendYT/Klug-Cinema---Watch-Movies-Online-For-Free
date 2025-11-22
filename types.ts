export enum UserRole {
  USER = 'user',
  CREATOR = 'creator',
  ADMIN = 'admin'
}

export enum MovieStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  credits: number; // Only relevant for creators
  avatarUrl?: string;
  password?: string; // Mock password for auth simulation
}

export interface Movie {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  releaseYear: number;
  watchLink: string;
  categoryId: string;
  coverImage: string; // Vertical Poster (2:3)
  thumbnailUrl: string; // Horizontal Backdrop (16:9)
  status: MovieStatus;
  views: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Request {
  id: string;
  creatorId: string;
  creatorName: string;
  movieId: string;
  movieTitle: string;
  action: 'upload' | 'edit' | 'delete' | 'promote';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface AppSettings {
  monetagLink: string;
}

export const CREDIT_COSTS = {
  UPLOAD: 10,
  EDIT: 5,
  DELETE: 5,
  PROMOTE: 10
};