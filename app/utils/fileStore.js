'use client';

import { supabase } from './supabase';

// ডাটাবেজ থেকে সব ফাইল ফেচ করা
export async function getStoredFiles() {
    const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching files:', error.message);
        return [];
    }
    return data || [];
}

// নতুন ফাইল ডাটাবেজে সেভ করা
export async function addStoredFile(fileData) {
    const { error } = await supabase
        .from('files')
        .insert([fileData]);

    if (error) {
        console.error('Error inserting file:', error.message);
        return false;
    }
    return true;
}

// ডাটাবেজ থেকে ফাইল ডিলিট করা
export async function deleteStoredFile(fileId) {
    const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

    if (error) {
        console.error('Error deleting file:', error.message);
        return false;
    }
    return true;
}