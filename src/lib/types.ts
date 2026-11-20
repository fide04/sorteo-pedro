export type Store = { id: string; slug: string; name: string; city: string | null; qr_token: string; active: boolean };
export type PublicStore = Pick<Store, "id" | "name" | "city">;
export type ReviewStatus = "aprobado" | "pendiente" | "rechazado";

export type ParticipantPoints = {
  id: string;
  cedula: string;
  full_name: string;
  phone: string;
  instagram: string | null;
  disqualified: boolean;
  created_at: string;
  checkins: number;
  stores_visited: number;
  stores_total: number;
  posts: number;
  points: number;
};

/** Lo que ve el participante de sí mismo después de registrarse. */
export type Passport = {
  firstName: string;
  points: number;
  storesTotal: number;
  posts: number;
  pendingPosts: number;
  pendingVideos: number;
  stores: { id: string; name: string; visited: boolean; pending: boolean; lastDay: string | null }[];
  lastCheckinId: string | null;
};

export type GalleryItem = {
  id: string;
  kind: "foto" | "video";
  video?: string; // URL firmada del video (solo videos)
  name: string; // "Ana P."
  store: string;
  day: string;
  points: number;
  src: string;
};

export type RankRow = { name: string; points: number; stores: number; storesTotal: number };
