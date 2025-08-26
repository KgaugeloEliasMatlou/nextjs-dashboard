'use server'; // Marks this file to be run on the server side

import { z } from 'zod'; // Imports Zod for schema validation
import postgres from 'postgres'; // Imports the postgres client library
import { revalidatePath } from 'next/cache'; // Imports function to revalidate Next.js cache
import { redirect } from 'next/navigation'; // Imports function to redirect user
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Creates a connection to the PostgreSQL database using the URL from environment variables, with SSL required
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
 
// Defines a schema for invoice data using Zod
const FormSchema = z.object({
  id: z.string(), // Invoice ID as a string
  customerId: z.string({ // Customer ID as a string, with custom error message
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce // Coerces input to a number
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }), // Must be greater than 0
  status: z.enum(['pending', 'paid'], { // Status must be 'pending' or 'paid', with custom error
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(), // Date as a string
});
 
// Creates a new schema for creating invoices, omitting 'id' and 'date' fields
const CreateInvoice = FormSchema.omit({ id: true, date: true });
 
// Type definition for the state object used in form actions
export type State = {
  errors?: {
    customerId?: string[]; // Array of errors for customerId
    amount?: string[]; // Array of errors for amount
    status?: string[]; // Array of errors for status
  };
  message?: string | null; // Message to display to user
};
 
// Asynchronous function to create a new invoice in the database
export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form using Zod schema
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'), // Get customerId from form data
    amount: formData.get('amount'), // Get amount from form data
    status: formData.get('status'), // Get status from form data
  });
 
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors, // Return validation errors
      message: 'Missing Fields. Failed to Create Invoice.', // Error message
    };
  }
 
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data; // Extract validated data
  const amountInCents = amount * 100; // Convert amount to cents
  const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
 
  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `; // SQL query to insert invoice
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.', // Error message
    };
  }
 
  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices'); // Refresh invoices page cache
  redirect('/dashboard/invoices'); // Redirect user to invoices page
}

// Use Zod to update the expected types for updating invoices
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
// Asynchronous function to update an invoice in the database
export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Asynchronous function to delete an invoice from the database
export async function deleteInvoice(id: string) {

  //throw new Error('Failed to Delete Invoice'); // Uncomment to simulate error
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`; // SQL query to delete invoice
    revalidatePath('/dashboard/invoices'); // Refresh invoices page cache
    //redirect('/dashboard/invoices'); // Optionally redirect user
  } catch (error) {
    console.error('Error deleting invoice:', error); // Log error to console
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}