import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '../lib/auth';
import { Disclosure, Transition, Dialog } from '@headlessui/react';
import { ChevronUpIcon, BookOpen, LayoutDashboard, Briefcase, Target, AlertTriangle, FileText, Users, Settings as SettingsIcon, Search, Edit, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'; 
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { supabase } from '../lib/supabase';
import { getIconComponent } from '../lib/iconMapping'; 



interface HelpSection {
  id: string;
  title: string;
  icon_name: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface HelpContentItem {
  id: string;
  section_id: string;
  title: string;
  content: string[];
  order: number;
}

interface HelpSidebarProps {
  sections: HelpSection[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  isAdmin?: boolean;
  onEditSection?: (section: HelpSection) => void;
  onDeleteSection?: (sectionId: string) => void;
  onAddSection?: () => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
}


interface HelpMainContentProps {
  currentSectionDetails?: HelpSection;
  contentToDisplay: HelpContentItem[];
  searchTerm: string;
  isAdmin?: boolean;
  openEditModal?: (item: HelpContentItem) => void;
  onDeleteClick: (id: string) => void;
}



const HelpMainContent: React.FC<HelpMainContentProps> = ({
  currentSectionDetails,
  contentToDisplay,
  searchTerm,
  isAdmin,
  openEditModal,
  onDeleteClick,
}) => (
  <main className="lg:col-span-9 py-6 px-4 sm:px-6 lg:px-8">
    <div className="max-w-3xl mx-auto">
      {searchTerm && contentToDisplay?.length === 0 && (
        <p className="text-gray-600">No results found for "{searchTerm}" in this section.</p>
      )}
      {!searchTerm && (
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          {currentSectionDetails?.icon_name && (() => {
            const Icon = getIconComponent(currentSectionDetails.icon_name);
            return <Icon className="h-7 w-7 mr-3 text-indigo-600" />;
          })()}
          {currentSectionDetails?.title}
        </h1>
      )}
      {!searchTerm && isAdmin && (
    <div className="text-center py-4">
      <button
        onClick={() => openEditModal && openEditModal({ id: 'new', section_id: currentSectionDetails?.id || '', title: '', content: [], order: 0 })}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Edit className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
        {contentToDisplay?.length === 0 ? 'Add New Content' : 'Add Additional Content'}
      </button>
    </div>
  )}
      {contentToDisplay?.map((item) => (
        <Disclosure as="div" key={item.id} className="mt-4 bg-white shadow-sm rounded-lg overflow-hidden">
          {({ open }) => (
            <>
              <Disclosure.Button className="flex justify-between w-full px-5 py-4 text-left text-lg font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-75">
                <span>{item.title}</span>
                <ChevronUpIcon
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } w-5 h-5 text-indigo-500`}
                />
              </Disclosure.Button>
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Disclosure.Panel className="px-5 pt-0 pb-5 text-gray-700">
                  {item.content.map((paragraph, index) => (
                    <p key={index} className="mb-3 last:mb-0">{paragraph}</p>
                  ))}
                  {isAdmin && (
                    <div className="mt-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal && openEditModal(item)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Edit className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteClick(item.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  )} 
                </Disclosure.Panel>
              </Transition>
            </>
          )}
        </Disclosure>
      ))}
    </div>
  </main>
);

const HelpSidebar: React.FC<HelpSidebarProps> = ({ 
  sections, 
  activeSection, 
  setActiveSection, 
  searchTerm, 
  setSearchTerm, 
  isMobileSidebarOpen, 
  setIsMobileSidebarOpen,
  isAdmin,
  onEditSection,
  onDeleteSection,
  onAddSection,
  onMoveSection
}) => {

  return (
  <aside className={`lg:col-span-3 py-6 lg:py-0 ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}>
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setIsMobileSidebarOpen(false)}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        Close Sections
      </button>
    </div>
    <nav className="sticky top-20 space-y-1 bg-white p-4 rounded-lg shadow-sm">
      <div className="mb-4">
        <label htmlFor="help-search" className="sr-only">Search help topics</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="help-search"
            id="help-search"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {isAdmin && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <button
            onClick={onAddSection}
            className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </button>
        </div>
      )}
      
      {sections.map((section, index) => {
        const Icon = getIconComponent(section.icon_name);
        return (
          <div key={section.id} className="relative group">
            <button
              onClick={() => {
                setActiveSection(section.id);
                setSearchTerm(''); // Reset search on section change
              }}
              className={`group flex items-center w-full text-left px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out ${
                activeSection === section.id
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${activeSection === section.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
              {section.title}
            </button>
            
            {isAdmin && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveSection && onMoveSection(section.id, 'up');
                  }}
                  disabled={index === 0}
                  className="p-1 rounded text-gray-400 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveSection && onMoveSection(section.id, 'down');
                  }}
                  disabled={index === sections.length - 1}
                  className="p-1 rounded text-gray-400 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSection && onEditSection(section);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-indigo-800"
                  title="Edit section"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection && onDeleteSection(section.id);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-red-800"
                  title="Delete section"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  </aside>
  );
};
 
 
interface EditHelpContentFormProps {
  isOpen: boolean;
  onClose: () => void;
  item: HelpContentItem | null;
  onSave: (item: HelpContentItem) => void;
  onCancel: () => void;
}

interface EditHelpSectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  section: HelpSection | null;
  onSave: (section: HelpSection) => void;
  onCancel: () => void;
  availableIcons: string[];
}



const EditHelpSectionForm: React.FC<EditHelpSectionFormProps> = ({ section, onSave, onCancel, availableIcons }) => {
  const [title, setTitle] = useState(section?.title || '');
  const [iconName, setIconName] = useState(section?.icon_name || 'BookOpen');
  const [displayOrder, setDisplayOrder] = useState(section?.display_order || 1);

  useEffect(() => {
    setTitle(section?.title || '');
    setIconName(section?.icon_name || 'BookOpen');
    setDisplayOrder(section?.display_order || 1);
  }, [section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (section) {
      onSave({
        ...section,
        title,
        icon_name: iconName,
        display_order: displayOrder
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="section-title" className="block text-sm font-medium text-gray-700">Section Title</label>
        <input
          type="text"
          id="section-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="section-icon" className="block text-sm font-medium text-gray-700">Icon</label>
        <select
          id="section-icon"
          value={iconName}
          onChange={(e) => setIconName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {availableIcons.map((icon) => {
            const IconComponent = getIconComponent(icon);
            return (
              <option key={icon} value={icon}>
                {icon}
              </option>
            );
          })}
        </select>
        <div className="mt-2 flex items-center">
          <span className="text-sm text-gray-500 mr-2">Preview:</span>
          {(() => {
            const IconComponent = getIconComponent(iconName);
            return <IconComponent className="h-5 w-5 text-indigo-600" />;
          })()}
        </div>
      </div>
      <div>
        <label htmlFor="section-order" className="block text-sm font-medium text-gray-700">Display Order</label>
        <input
          type="number"
          id="section-order"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
          min="1"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save Section
        </button>
      </div>
    </form>
  );
};

const EditHelpContentForm: React.FC<EditHelpContentFormProps> = ({ item, onSave, onCancel }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content.join('\n') || '');

  useEffect(() => {
    setTitle(item?.title || '');
    setContent(item?.content.join('\n') || '');
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      onSave({
        ...item,
        title,
        content: content.split('\n').filter(line => line.trim() !== '')
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div>
        <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700">Content (one line per paragraph/list item)</label>
        <textarea
          id="edit-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

interface HelpMainContentProps {
  currentSectionDetails?: HelpSection;
  contentToDisplay: HelpContentItem[];
  searchTerm: string;
  onEditClick: (item: HelpContentItem) => void;
  onDeleteClick: (id: string) => void;
}


const Help = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'super_admin' || false;


  const openEditModal = (item: HelpContentItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveEdit = async (updatedItem: HelpContentItem) => {
    try {
      if (updatedItem.id === 'new') {
        // Insert new content
        const { data, error } = await supabase
          .from('help_content')
          .insert({
            section_id: updatedItem.section_id,
            title: updatedItem.title,
            content: updatedItem.content,
            order: updatedItem.order || 0, // Assign a default order or calculate it
          })
          .select();

        if (error) {
          throw error;
        }
        setHelpContent(prevContent => [...prevContent, data[0]]);
      } else {
        // Update existing content
        const { error } = await supabase
          .from('help_content')
          .update({ title: updatedItem.title, content: updatedItem.content })
          .eq('id', updatedItem.id);

        if (error) {
          throw error;
        }
        setHelpContent(prevContent =>
          prevContent.map(item => (item.id === updatedItem.id ? updatedItem : item))
        );
      }
      closeEditModal();
    } catch (err: any) {
      console.error('Error saving help content:', err.message);
      // Optionally, show an error message to the user
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('help_content')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
      setHelpContent(prevContent => prevContent.filter(item => item.id !== id));
    } catch (err: any) {
      console.error('Error deleting help content:', err.message);
      // Optionally, show an error message to the user
    }
  };

  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');
  const [helpContent, setHelpContent] = useState<HelpContentItem[]>([]);
  const [sections, setSections] = useState<HelpSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpContentItem | null>(null);
  const [isSectionEditModalOpen, setIsSectionEditModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HelpSection | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch help sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('help_sections')
          .select('*')
          .order('display_order', { ascending: true });

        if (sectionsError) {
          throw sectionsError;
        }

        // Fetch help content
        const { data: contentData, error: contentError } = await supabase
          .from('help_content')
          .select('*')
          .order('order', { ascending: true });

        if (contentError) {
          throw contentError;
        }

        setSections(sectionsData || []);
        setHelpContent(contentData || []);
        
        // Set the first section as active if sections exist
        if (sectionsData && sectionsData.length > 0) {
          setActiveSection(sectionsData[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Available icons for section selection
  const availableIcons = [
    'BookOpen', 'LayoutDashboard', 'Briefcase', 'Target', 'AlertTriangle', 
    'FileText', 'Users', 'Settings', 'Search', 'Edit', 'Plus', 'Trash2',
    'ArrowUp', 'ArrowDown', 'ChevronUpIcon'
  ];

  // Section management functions
  const openSectionEditModal = (section: HelpSection) => {
    setEditingSection(section);
    setIsSectionEditModalOpen(true);
  };

  const closeSectionEditModal = () => {
    setIsSectionEditModalOpen(false);
    setEditingSection(null);
  };

  const handleAddSection = () => {
    const newSection: HelpSection = {
      id: 'new',
      title: '',
      icon_name: 'BookOpen',
      display_order: sections.length + 1
    };
    openSectionEditModal(newSection);
  };

  const handleSaveSection = async (updatedSection: HelpSection) => {
    try {
      if (updatedSection.id === 'new') {
        // Insert new section
        const { data, error } = await supabase
          .from('help_sections')
          .insert({
            id: updatedSection.title.toLowerCase().replace(/\s+/g, '-'),
            title: updatedSection.title,
            icon_name: updatedSection.icon_name,
            display_order: updatedSection.display_order
          })
          .select();

        if (error) {
          throw error;
        }
        setSections(prevSections => [...prevSections, data[0]].sort((a, b) => a.display_order - b.display_order));
      } else {
        // Update existing section
        const { error } = await supabase
          .from('help_sections')
          .update({
            title: updatedSection.title,
            icon_name: updatedSection.icon_name,
            display_order: updatedSection.display_order
          })
          .eq('id', updatedSection.id);

        if (error) {
          throw error;
        }
        setSections(prevSections =>
          prevSections.map(section => 
            section.id === updatedSection.id ? updatedSection : section
          ).sort((a, b) => a.display_order - b.display_order)
        );
      }
      closeSectionEditModal();
    } catch (err: any) {
      console.error('Error saving help section:', err.message);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section? All content in this section will also be deleted.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('help_sections')
        .delete()
        .eq('id', sectionId);

      if (error) {
        throw error;
      }
      setSections(prevSections => prevSections.filter(section => section.id !== sectionId));
      // If the deleted section was active, switch to the first available section
      if (activeSection === sectionId && sections.length > 1) {
        const remainingSections = sections.filter(section => section.id !== sectionId);
        if (remainingSections.length > 0) {
          setActiveSection(remainingSections[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error deleting help section:', err.message);
    }
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const updatedSections = [...sections];
    const currentSection = updatedSections[sectionIndex];
    const targetSection = updatedSections[targetIndex];

    // Swap display orders
    const tempOrder = currentSection.display_order;
    currentSection.display_order = targetSection.display_order;
    targetSection.display_order = tempOrder;

    try {
      // Update both sections in the database
      await Promise.all([
        supabase
          .from('help_sections')
          .update({ display_order: currentSection.display_order })
          .eq('id', currentSection.id),
        supabase
          .from('help_sections')
          .update({ display_order: targetSection.display_order })
          .eq('id', targetSection.id)
      ]);

      // Update local state
      setSections(updatedSections.sort((a, b) => a.display_order - b.display_order));
    } catch (err: any) {
      console.error('Error moving section:', err.message);
    }
  };

  const currentSectionDetails = useMemo(() => sections.find((s) => s.id === activeSection), [sections, activeSection]);
  
  const contentToDisplay = useMemo(() => {
    if (!currentSectionDetails) return [];
    const sectionContent = helpContent.filter(item => item.section_id === activeSection);
    if (!searchTerm) return sectionContent;

    return sectionContent.map(subSection => ({
      ...subSection,
      content: subSection.content.filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
    })).filter(subSection => subSection.content.length > 0);
  }, [currentSectionDetails, activeSection, searchTerm]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-100 py-8 flex justify-center items-center">
          <p className="text-gray-600">Loading help content...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-100 py-8 flex justify-center items-center">
          <p className="text-red-600">Error loading help content: {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-100 py-8 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
            {/* Mobile sidebar toggle */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Toggle Sections
              </button>
            </div>
            <HelpSidebar 
              sections={sections}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isMobileSidebarOpen={isMobileSidebarOpen}
              setIsMobileSidebarOpen={setIsMobileSidebarOpen}
              isAdmin={isAdmin}
              onEditSection={openSectionEditModal}
              onDeleteSection={handleDeleteSection}
              onAddSection={handleAddSection}
              onMoveSection={handleMoveSection}
            />
            <HelpMainContent
            currentSectionDetails={currentSectionDetails}
            contentToDisplay={contentToDisplay}
            searchTerm={searchTerm}
            onEditClick={openEditModal}
            isAdmin={isAdmin}
            openEditModal={openEditModal}
            onDeleteClick={handleDeleteContent}
            />
          </div>
        </div>
      </div>

      {isEditModalOpen && editingItem && (
        <Transition appear show={isEditModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={closeEditModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Edit Help Content
                    </Dialog.Title>
                    <div className="mt-4">
                      <EditHelpContentForm
                        isOpen={isEditModalOpen}
                        onClose={closeEditModal}
                        item={editingItem}
                        onSave={handleSaveEdit}
                        onCancel={closeEditModal}
                      />
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}

      {isSectionEditModalOpen && (
        <Transition appear show={isSectionEditModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-10" onClose={closeSectionEditModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {editingSection ? 'Edit Section' : 'Add New Section'}
                    </Dialog.Title>
                    <div className="mt-4">
                      <EditHelpSectionForm
                        isOpen={isSectionEditModalOpen}
                        onClose={closeSectionEditModal}
                        section={editingSection}
                        onSave={handleSaveSection}
                        onCancel={closeSectionEditModal}
                        availableIcons={availableIcons}
                      />
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}
    </DashboardLayout>
  );
};

export default Help;