// --- IMPORTANT SECURITY WARNING ---
// This file contains hardcoded credentials and is NOT secure.
// It is intended for demonstration or local-only prototyping purposes.
// DO NOT use this method in a production application.
// Anyone can view this code in their browser and see all emails and passwords.

import { UserRole } from '../types';

interface UserCredentials {
    email: string;
    password: string;
    role: UserRole;
}

// To add or remove users, simply edit the array below.
// Make sure each entry has a unique email.
export const ALLOWED_USERS: UserCredentials[] = [
  {
    email: 'charangontla24@gmail.com',
    password: '123456789',
    role: 'employee',
  },
  {
    email: 'satishgontla02@gmail.com',
    password: '123456789',
    role: 'employee',
  },
  {
    email: 'satishdistributors@gmail.com',
    password:  '9849019071',
    role: 'admin',
  },
  
  // Add more users here as needed
  // {
  //   email: 'anotheruser@example.com',
  //   password: 'securepassword',
  //   role: 'employee',
  // },
];
