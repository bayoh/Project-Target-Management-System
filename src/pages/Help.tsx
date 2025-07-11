import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '../lib/auth';
import { Disclosure, Transition, Dialog } from '@headlessui/react';
import { ChevronUpIcon, BookOpen, LayoutDashboard, Briefcase, Target, AlertTriangle, FileText, Users, Settings as SettingsIcon, Search, Icon as LucideIcon, Edit } from 'lucide-react'; 
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { supabase } from '../lib/supabase'; 



interface HelpSection {
  id: string;
  title: string;
  icon: LucideIcon;
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
          {currentSectionDetails?.icon && <currentSectionDetails.icon className="h-7 w-7 mr-3 text-indigo-600" />}
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

const HelpSidebar: React.FC<HelpSidebarProps> = ({ sections, activeSection, setActiveSection, searchTerm, setSearchTerm, isMobileSidebarOpen, setIsMobileSidebarOpen }) => {

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
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <button
            key={section.id}
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
         content: content.split('\n').map(line => line.trim())
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HelpContentItem | null>(null);

  useEffect(() => {
    const fetchHelpContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('help_content')
          .select('*')
          .order('order', { ascending: true });

        if (error) {
          throw error;
        }
        console.log(data)
        setHelpContent(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpContent();
  }, []);

  const sections: HelpSection[] = [
    { id: 'getting-started', title: 'Getting Started', icon: BookOpen },
    { id: 'user-dashboard', title: 'User Dashboard', icon: LayoutDashboard },
    { id: 'interventions', title: 'Interventions Management', icon: Briefcase },
    { id: 'actions', title: 'Actions Management', icon: Target },
    { id: 'issues', title: 'Issue Tracking', icon: AlertTriangle },
    { id: 'reports', title: 'Reports', icon: FileText },
    { id: 'user-management', title: 'User Management', icon: Users },
    { id: 'system-settings', title: 'System Settings', icon: SettingsIcon },
  ];

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
    </DashboardLayout>
  );
};

export default Help;