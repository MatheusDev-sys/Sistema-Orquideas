export type OrchidStatus = 'in_stock' | 'sold';

export interface Orchid {
  id: string;
  event_id: string;
  name: string;
  code: string;
  price: number;
  created_at: string;
  status: OrchidStatus;
  photo_urls: string[];
  created_by: string;
}

export interface Log {
  id: string;
  event_id: string;
  created_at: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'SOLD' | 'DELETE' | 'RESET_EVENT';
  orchid_id?: string;
  orchid_code?: string;
  orchid_name?: string;
  message?: string;
}

export interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface AppState {
  current_event_id: string;
}
