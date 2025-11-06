import toast from 'react-hot-toast';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
  hint?: string;
}

/**
 * Maps Supabase error codes to user-friendly error messages
 */
function getSupabaseErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as AppError;
    
    // Handle common Supabase error codes
    switch (supabaseError.code) {
      case '23505': // Unique violation
        return 'This record already exists. Please use a unique value.';
      case '23503': // Foreign key violation
        return 'Cannot perform this operation. Related records exist.';
      case '23502': // Not null violation
        return 'Required fields are missing. Please fill in all required fields.';
      case '22P02': // Invalid input syntax
        return 'Invalid input format. Please check your data and try again.';
      case 'PGRST116': // Not found
        return 'The requested resource was not found.';
      case '42501': // Insufficient privilege
        return 'You do not have permission to perform this action.';
      case '42P01': // Undefined table
        return 'Database error. Please contact support.';
      default:
        // Return the error message if available, otherwise generic message
        return supabaseError.message || 'An unexpected error occurred';
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Gets a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const appError = error as AppError;
    
    // Check if it's a Supabase error
    if (appError.code) {
      return getSupabaseErrorMessage(error);
    }
    
    // Check if it has a message property
    if (appError.message) {
      return appError.message;
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Handles mutation errors and shows toast notification
 */
export function handleMutationError(error: unknown): void {
  const message = getErrorMessage(error);
  toast.error(message);
}

/**
 * Handles query errors and shows toast notification
 */
export function handleQueryError(error: unknown): void {
  const message = getErrorMessage(error);
  toast.error(message);
}

/**
 * Logs error for debugging purposes
 */
export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const errorObj = error instanceof Error ? error : new Error(message);
  
  console.error(`[Error${context ? ` in ${context}` : ''}]:`, {
    message: errorObj.message,
    stack: errorObj.stack,
    originalError: error,
  });
}

