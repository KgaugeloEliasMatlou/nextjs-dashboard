'use client';
import { CustomerField } from '@/app/lib/definitions'; // Import type for customer dropdown
import Link from 'next/link'; // Import Next.js Link component for navigation
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'; // Import icons for UI
import { Button } from '@/app/ui/button'; // Import custom Button component
import { createInvoice, State } from '@/app/lib/actions'; // Import invoice creation action and state type
import { useActionState } from 'react'; // Import React hook for form actions

export default function Form({ customers }: { customers: CustomerField[] }) { // Main form component, receives customers list as prop
  const initialState: State = { message: null, errors: {} }; // Initial state for form validation and messages
  const [state, formAction] = useActionState(createInvoice, initialState); // Hook to handle form submission and state

  return (
    <form action={formAction}> {/* Form element, uses formAction for submission */}
      <div className="rounded-md bg-gray-50 p-4 md:p-6"> {/* Container for form fields */}
        {/* Customer Name */}
        <div className="mb-4"> {/* Margin bottom for spacing */}
          <label htmlFor="customer" className="mb-2 block text-sm font-medium">
            Choose customer {/* Label for customer dropdown */}
          </label>
          <div className="relative"> {/* Positioning for icon */}
            <select
              id="customer" // HTML id for select
              name="customerId" // Name for form data
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500" // Styling
              defaultValue="" // Default value is empty
              aria-describedby="customer-error"
            >
              <option value="" disabled>
                Select a customer {/* Placeholder option */}
              </option>
              {
                customers.map((customer) => ( // Map over customers to create options
                <option key={customer.id} value={customer.id}>
                  {customer.name} {/* Display customer name */}
                </option>
              ))}
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" /> {/* Icon inside select */}
          </div>
          <div id="customer-error" aria-live="polite" aria-atomic="true">
            {state.errors?.customerId &&
              state.errors.customerId.map((error: string) => (
                <p className="mt-2 text-sm text-red-500" key={error}>
                  {error}
                </p>
              ))}
          </div>
        </div>

        {/* Invoice Amount */}
        <div className="mb-4"> {/* Margin bottom for spacing */}
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            Choose an amount {/* Label for amount input */}
          </label>
          <div className="relative mt-2 rounded-md"> {/* Positioning for icon */}
            <div className="relative">
              <input
                id="amount" // HTML id for input
                name="amount" // Name for form data
                type="number" // Input type is number
                step="0.01" // Allow decimals
                placeholder="Enter USD amount" // Placeholder text
                className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500" // Styling
                aria-describedby="amount-error"
              />
              <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" /> {/* Dollar icon */}
            </div>
            <div id="amount-error" aria-live="polite" aria-atomic="true">
              {state.errors?.amount &&
                state.errors.amount.map((error: string) => (
                  <p className="mt-2 text-sm text-red-500" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
        </div>

        {/* Invoice Status */}
        <fieldset> {/* Group radio buttons for status */}
          <legend className="mb-2 block text-sm font-medium">
            Set the invoice status {/* Legend for status radios */}
          </legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3"> {/* Styling for radio group */}
            <div className="flex gap-4"> {/* Flex layout for radios */}
              <div className="flex items-center"> {/* Pending radio */}
                <input
                  id="pending" // HTML id for radio
                  name="status" // Name for form data
                  type="radio" // Input type is radio
                  value="pending" // Value for form data
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2" // Styling
                  aria-describedby="status-error"
                />
                <label
                  htmlFor="pending"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600"
                >
                  Pending <ClockIcon className="h-4 w-4" /> {/* Pending label and icon */}
                </label>
              </div>
              <div className="flex items-center"> {/* Paid radio */}
                <input
                  id="paid" // HTML id for radio
                  name="status" // Name for form data
                  type="radio" // Input type is radio
                  value="paid" // Value for form data
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2" // Styling
                />
                <label
                  htmlFor="paid"
                  className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Paid <CheckIcon className="h-4 w-4" /> {/* Paid label and icon */}
                </label>
              </div>
              
            </div>
          </div>
          <div id="status-error" aria-live="polite" aria-atomic="true">
            {state.errors?.status &&
              state.errors.status.map((error: string) => (
                <p className="mt-2 text-sm text-red-500" key={error}>
                  {error}
                </p>
              ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-6 flex justify-end gap-4"> {/* Container for buttons */}
        <Link
          href="/dashboard/invoices" // Link to invoices dashboard
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancel {/* Cancel button */}
        </Link>
        <Button type="submit">Create Invoice</Button> {/* Submit button */}
      </div>
    </form>
  );
}
