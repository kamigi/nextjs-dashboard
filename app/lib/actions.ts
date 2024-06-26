'use server';

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce.number().gt(0, { message: 'amount must be greater than zero.'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.'
    }),
    date: z.string()
});

const CreateInvoice = FormSchema.omit({id: true, date: true});
const UpdateInvoice = FormSchema.omit({id: true, date: true});

export type State = {
    errors?: {
        customerId?: string[],
        amount?: string[],
        status?: string[]
    };
    message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
    // Convert FormData to JavaScript Object and retrieve it as rawFormData
    // const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });
    if(!validatedFields.success) return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.'
    };
    const { customerId, amount, status } = validatedFields.data;   
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    try {
        
        await sql`INSERT INTO invoices (customer_id, amount, status, date)
        VALUES(${customerId}, ${amountInCents}, ${status}, ${date})`;
    } catch (e) {
        return {message:`Error while creating invoice`};
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {

    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    });
    if(!validatedFields.success) return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Edit Invoice.'
    }
    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = Math.round(amount * 100);
    console.log(amount, amountInCents);

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (e) {
        return {message:`Error while updating edited invoice`};
    }
    
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to delete invoice');
    try{
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices')
        return { message:`Invoice Deleted!` }
    } 
    catch (e) { return { message:`Error while deleting invoice` } }
    
}