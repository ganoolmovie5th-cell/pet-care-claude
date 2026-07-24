export interface PlaydatePost {
  id: string;
  ownerId: string;
  petId: string;
  petName?: string;
  breed?: string;
  age?: number;
  photo?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  date: string;
  description: string;
  interested_owners: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id?: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface PlaydateChat {
  id: string;
  postId: string;
  ownerId: string;
  interestedOwnerId: string;
  messages: Message[];
  status: 'active' | 'archived';
  created_at: string;
  updated_at?: string;
}

export interface PlaydateFilter {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  breed?: string;
  ageMin?: number;
  ageMax?: number;
  dateStart?: string;
  dateEnd?: string;
}
