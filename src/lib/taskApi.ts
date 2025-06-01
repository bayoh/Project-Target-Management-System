import { supabase } from './supabase';
import type { Task } from '../types/project';

async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export const taskApi = {
  createTask,
  updateTask,
};
