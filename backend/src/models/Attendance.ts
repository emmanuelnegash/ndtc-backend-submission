export interface Attendance {
    id?: number;
    eventId: number;
    firstName: string;
    lastName: string;
    email: string;
    interestedInVolunteering: boolean;
    volunteerRole?: string;
    donationAmount: number;
    createdAt?: string;
    updatedAt?: string;
  }