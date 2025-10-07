// --- IMPORTANT SECURITY WARNING ---
// This file contains hardcoded credentials and is NOT secure.
// It is intended for demonstration or local-only prototyping purposes.
// DO NOT use this method in a production application that will be accessible on the public internet.
// Anyone can view this code in their browser and see the email and password.
// For real applications, always use a secure backend authentication service like Supabase or Firebase.

import { ALLOWED_USERS } from './userDatabase';

export interface User {
  email: string;
}

/**
 * Simulates a sign-in process by checking credentials against a predefined list.
 * @param email The email to check.
 * @param password The password to check.
 * @returns A Promise that resolves with a User object on success, or rejects with an Error on failure.
 */
function signIn(email: string, password: string): Promise<User> {
  return new Promise((resolve, reject) => {
    // Simulate a network request delay
    setTimeout(() => {
      const normalizedEmail = email.toLowerCase();
      const user = ALLOWED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);

      if (user && user.password === password) {
        resolve({ email: user.email });
      } else {
        reject(new Error('Invalid email or password. Please try again.'));
      }
    }, 1000); // 1-second delay
  });
}

/**
 * Simulates a sign-out process.
 */
function signOut(): void {
  // In this simple model, signing out doesn't need to do anything here.
  // The state will be cleared in the AuthContext.
  console.log('User signed out.');
}

export const authService = {
  signIn,
  signOut,
};
