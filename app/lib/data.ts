import postgres from 'postgres'; // Import postgres client for database connection
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions'; // Import TypeScript types for data models
import { formatCurrency } from './utils'; // Import utility to format currency

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' }); // Create a connection to PostgreSQL using env variable

// Fetches all revenue records from the database
export async function fetchRevenue() {
  try {
    // Artificial delay for demo purposes (commented out)
    const data = await sql<Revenue[]>`SELECT * FROM revenue`; // Query all revenue rows
    return data; // Return fetched data
  } catch (error) {
    console.error('Database Error:', error); // Log error
    throw new Error('Failed to fetch revenue data.'); // Throw error for caller
  }
}

// Fetches the latest 5 invoices, joining with customer info
export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`; // Get latest 5 invoices with customer info

    // Format amount for display
    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices; // Return formatted invoices
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

// Fetches summary data for dashboard cards (counts and totals)
export async function fetchCardData() {
  try {
    // Run three queries in parallel for counts and sums
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]); // Wait for all queries to finish

    // Extract and format results
    const numberOfInvoices = Number(data[0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    }; // Return dashboard card data
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6; // Number of items per page for pagination

// Fetches filtered invoices for a given search query and page
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE; // Calculate offset for pagination

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `; // Query filtered invoices with pagination

    return invoices; // Return filtered invoices
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

// Fetches total number of pages for filtered invoices
export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `; // Count filtered invoices

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE); // Calculate total pages
    return totalPages; // Return total pages
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

// Fetches a single invoice by its ID
export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `; // Query invoice by ID

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0]; // Return the invoice object
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

// Fetches all customers (id and name only)
export async function fetchCustomers() {
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `; // Query all customers

    return customers; // Return customer list
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

// Fetches filtered customers for a given search query
export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
        SELECT
          customers.id,
          customers.name,
          customers.email,
          customers.image_url,
          COUNT(invoices.id) AS total_invoices,
          SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
          SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
        FROM customers
        LEFT JOIN invoices ON customers.id = invoices.customer_id
        WHERE
          customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
        GROUP BY customers.id, customers.name, customers.email, customers.image_url
        ORDER BY customers.name ASC
      `; // Query filtered customers with invoice stats

    // Format totals for display
    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers; // Return formatted customer data
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
