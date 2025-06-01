import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { userApi } from '../../lib/userApi';
import {  User  } from '../../types/auth';

interface Project {
  id: string;
  name: string;
  description: string;
  created_by: string;
}

interface Partner {
  id: string;
  name: string;
  description: string;
  created_by: string;

}

export function ProjectPartnerManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'project' | 'partner'>('project');
  const [editingItem, setEditingItem] = useState<Project | Partner | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'partners'>('projects');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    created_by: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchPartners();
    fetchUsers();
    fetchUser(); // Fetch the user on component mount or when the user changes her
  }, []);

const fetchUsers = async () => {
  const data  = await userApi.getUsers();
  setUsers(data as User[] || null);
  if (!data) {
    console.error('Error fetching users:');
    return [];
  }
}

const fetchUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  console.log(data);
  setUser(data.user as User || null);
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return data.user;
}

const fetchProjects = async () => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from('associated_projects')
      .select('*');

    if (error) {
      throw error;
    }

    setProjects(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects';
    showError(message);
  } finally {
    setIsLoading(false);
  }
};

const fetchPartners = async () => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from('implementing_partners')
      .select('*');

    if (error) {
      throw error;
    }

    setPartners(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch partners';
    showError(message);
  } finally {
    setIsLoading(false);
  }
};

  const showError = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const showSuccess = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const handleAdd = (type: 'project' | 'partner') => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      created_by: user?.id || '',

    });
    setFormErrors({});
    setIsModalVisible(true);
  };

  const handleEdit = (item: Project | Partner, type: 'project' | 'partner') => {
    setModalType(type);
    setEditingItem(item);
    setFormData(item);
    setFormErrors({});
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string, type: 'project' | 'partner') => {
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from(type === 'project' ? 'associated_projects' : 'implementing_partners')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      showSuccess(`${type} deleted successfully`);
      if (type === 'project') {
        fetchProjects();
      } else {
        fetchPartners();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to delete ${type}`;
      showError(message);
    } finally {
      setIsDeleting(null);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      errors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (trimmedName.length > 50) {
      errors.name = 'Name must not exceed 50 characters';
    }
    
    if (modalType === 'project') {
      const trimmedDescription = formData.description.trim();
      
      if (!trimmedDescription) {
        errors.description = 'Description is required';
      } else if (trimmedDescription.length < 5) {
        errors.description = 'Description must be at least 5 characters long';
      } else if (trimmedDescription.length > 80) {
        errors.description = 'Description must not exceed 50 characters';
      }
      
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

const handleModalSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  setIsSubmitting(true);

  try {
    const table = modalType === 'project' ? 'associated_projects' : 'implementing_partners';
    let result;

    if (editingItem) {
      // Update existing item
      const { data, error } = await supabase
        .from(table)
        .update(formData)
        .eq('id', editingItem.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new item
      const { data, error } = await supabase
        .from(table)
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    showSuccess(`${modalType} ${editingItem ? 'updated' : 'created'} successfully`);
    setIsModalVisible(false);
    
    if (modalType === 'project') {
      fetchProjects();
    } else {
      fetchPartners();
    }
    
    setFormData({
      name: '',
      description: '',
      created_by: user?.id || '',
    });
    setFormErrors({});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    showError(message);
  } finally {
    setIsSubmitting(false);
  }
};

  const renderTable = (type: 'projects' | 'partners') => {
    const data = type === 'projects' ? projects : partners;
    
    return (
      <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(item as Project).description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{users.find(user => user.id === item.created_by)?.full_name }</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center space-x-4">
                  <button
                    onClick={() => handleEdit(item, type === 'projects' ? 'project' : 'partner')}
                    className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, type === 'projects' ? 'project' : 'partner')}
                    className="text-red-600 hover:text-red-800 transition-colors duration-200"
                    disabled={isDeleting === item.id}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'projects'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'partners'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('partners')}
          >
            Partners
          </button>
        </nav>
      </div>

      <div className="mb-6">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg inline-flex items-center transition-colors duration-200 shadow-sm"
          onClick={() => handleAdd(activeTab === 'projects' ? 'project' : 'partner')}
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add {activeTab === 'projects' ? 'Project' : 'Partner'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        renderTable(activeTab)
      )}

      {isModalVisible && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full backdrop-blur-sm transition-opacity z-50">
          <div className="relative top-20 mx-auto p-6 border w-[32rem] shadow-xl rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {editingItem ? 'Edit' : 'Add'} {modalType}
              </h3>
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition duration-200 ${formErrors.name ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-red-500 text-xs">{formErrors.name}</p>
                  )}
                </div>
                <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="description">
                        Description
                      </label>
                      <input
                        type="text"
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition duration-200 ${formErrors.description ? 'border-red-500' : ''}`}
                        disabled={isSubmitting}
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-red-500 text-xs">{formErrors.description}</p>
                      )}
                    </div>
                <div className="flex items-center justify-end mt-6 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalVisible(false)}
                    className="bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg mr-3 hover:bg-gray-50 transition-colors duration-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingItem ? 'Updating...' : 'Creating...'}
                      </div>
                    ) : (
                      editingItem ? 'Update' : 'Create'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};