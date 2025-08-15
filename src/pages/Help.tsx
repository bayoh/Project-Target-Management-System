import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '../lib/auth';
import { Disclosure, Transition, Dialog } from '@headlessui/react';
import { ChevronUpIcon, BookOpen, LayoutDashboard, Briefcase, Target, AlertTriangle, FileText, Users, Settings as SettingsIcon, Search, Edit, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'; 
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { supabase } from '../lib/supabase';
import { getIconComponent } from '../lib/iconMapping';
import { useActivityTracking } from '../hooks/useActivityTracking'; 



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
  <main className="lg:col-span-9 py-3 px-3 sm:px-4 lg:px-6">
    <div className="max-w-4xl mx-auto">
      {/* Search Results Header */}
      {searchTerm && (
        <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-blue-50 border border-blue-200 rounded-xl">
          {contentToDisplay?.length === 0 ? (
            <div className="flex items-center text-amber-700">
              <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 mr-2 flex-shrink-0" />
              <p className="text-sm lg:text-base">No results found for <span className="font-semibold">"{searchTerm}"</span> in this section.</p>
            </div>
          ) : (
            <div className="flex items-center text-blue-700">
              <Search className="h-4 w-4 lg:h-5 lg:w-5 mr-2 flex-shrink-0" />
              <p className="text-sm lg:text-base">Found <span className="font-semibold">{contentToDisplay.length}</span> result{contentToDisplay.length !== 1 ? 's' : ''} for <span className="font-semibold">"{searchTerm}"</span></p>
            </div>
          )}
        </div>
      )}
      
      {/* Section Header */}
      {!searchTerm && (
        <div className="mb-4 lg:mb-6">
          <div className="flex items-center mb-3 lg:mb-4">
            {currentSectionDetails?.icon_name && (() => {
              const Icon = getIconComponent(currentSectionDetails.icon_name);
              return (
                <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mr-3 lg:mr-4 shadow-lg flex-shrink-0">
                  <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              );
            })()}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900 leading-tight truncate">
                {currentSectionDetails?.title}
              </h1>
              <p className="text-gray-600 mt-1 text-sm lg:text-base hidden sm:block">Comprehensive help and documentation</p>
            </div>
          </div>
          
          {/* Admin Add Content Button */}
          {isAdmin && (
            <div className="mb-4 lg:mb-6">
              <button
                onClick={() => openEditModal && openEditModal({ id: 'new', section_id: currentSectionDetails?.id || '', title: '', content: [], order: 0 })}
                className="inline-flex items-center px-3 lg:px-4 py-2 lg:py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                <span className="hidden sm:inline">{contentToDisplay?.length === 0 ? 'Add New Content' : 'Add Additional Content'}</span>
                <span className="sm:hidden">Add Content</span>
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Content Cards */}
      <div className="space-y-3 lg:space-y-4">
        {contentToDisplay?.map((item, index) => (
          <Disclosure as="div" key={item.id} className="bg-white shadow-sm rounded-lg lg:rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            {({ open }) => (
              <>
                <Disclosure.Button className="flex justify-between w-full px-4 lg:px-5 py-3 lg:py-4 text-left text-base lg:text-lg font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors duration-200">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex items-center justify-center w-6 h-6 lg:w-8 lg:h-8 rounded-lg bg-gray-100 mr-2 lg:mr-3 flex-shrink-0">
                      <span className="text-xs lg:text-sm font-bold text-gray-600">{index + 1}</span>
                    </div>
                    <span className="text-gray-900 truncate">{item.title}</span>
                  </div>
                  <ChevronUpIcon
                    className={`${
                      open ? 'transform rotate-180' : ''
                    } w-4 h-4 lg:w-5 lg:h-5 text-blue-500 transition-transform duration-200 flex-shrink-0 ml-2`}
                  />
                </Disclosure.Button>
                <Transition
                  show={open}
                  enter="transition duration-200 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-150 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Disclosure.Panel className="px-4 lg:px-5 pt-0 pb-4 lg:pb-5">
                    <div className="border-t border-gray-100 pt-3 lg:pt-4">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {item.content.map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex} className="mb-2 lg:mb-3 last:mb-0 leading-relaxed text-sm lg:text-base">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                      
                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-gray-100 flex justify-end space-x-1 lg:space-x-2">
                          <button
                            onClick={() => openEditModal && openEditModal(item)}
                            className="inline-flex items-center px-2 lg:px-3 py-1.5 lg:py-2 border border-transparent text-xs lg:text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                          >
                            <Edit className="-ml-0.5 mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => onDeleteClick(item.id)}
                            className="inline-flex items-center px-2 lg:px-3 py-1.5 lg:py-2 border border-transparent text-xs lg:text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                          >
                            <Trash2 className="-ml-0.5 mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </Disclosure.Panel>
                </Transition>
              </>
            )}
          </Disclosure>
        ))}
      </div>
      
      {/* Empty State */}
      {!searchTerm && contentToDisplay?.length === 0 && (
        <div className="text-center py-8 lg:py-12">
          <div className="flex justify-center mb-3 lg:mb-4">
            <div className="flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gray-100">
              <BookOpen className="h-6 w-6 lg:h-8 lg:w-8 text-gray-400" />
            </div>
          </div>
          <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">No content available</h3>
          <p className="text-gray-600 mb-4 lg:mb-6 text-sm lg:text-base px-4">This section doesn't have any content yet.</p>
          {isAdmin && (
            <button
              onClick={() => openEditModal && openEditModal({ id: 'new', section_id: currentSectionDetails?.id || '', title: '', content: [], order: 0 })}
              className="inline-flex items-center px-3 lg:px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Add First Content</span>
              <span className="sm:hidden">Add Content</span>
            </button>
          )}
        </div>
      )}
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
  <aside className={`lg:col-span-3 py-3 lg:py-0 ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}>
    <div className="lg:hidden mb-3">
      <button
        onClick={() => setIsMobileSidebarOpen(false)}
        className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
      >
        Close Sections
      </button>
    </div>
    <nav className="sticky top-16 space-y-1 bg-white p-3 rounded-xl shadow-lg border border-gray-100">
      {/* Enhanced Search Section */}
      <div className="mb-3">
        <label htmlFor="help-search" className="sr-only">Search help topics</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            name="help-search"
            id="help-search"
            className="block w-full pl-9 pr-3 py-2 lg:py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200"
            placeholder="Search help topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Admin Controls */}
      {isAdmin && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <button
            onClick={onAddSection}
            className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </button>
        </div>
      )}
      
      {/* Navigation Sections */}
      <div className="space-y-1">
        {sections.map((section, index) => {
          const Icon = getIconComponent(section.icon_name);
          return (
            <div key={section.id} className="relative group">
              <button
                onClick={() => {
                  setActiveSection(section.id);
                  setSearchTerm(''); // Reset search on section change
                }}
                className={`group flex items-center w-full text-left px-2 lg:px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-[1.02]'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 lg:w-7 lg:h-7 rounded-lg mr-2 lg:mr-3 flex-shrink-0 transition-colors duration-200 ${
                  activeSection === section.id 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Icon className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${activeSection === section.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-700'}`} />
                </div>
                <span className="truncate text-xs lg:text-sm">{section.title}</span>
              </button>
              
              {/* Admin Controls */}
              {isAdmin && (
                <div className="absolute right-1 lg:right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-0.5 bg-white rounded-md shadow-sm border border-gray-200 p-0.5 lg:p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection && onMoveSection(section.id, 'up');
                    }}
                    disabled={index === 0}
                    className="p-0.5 lg:p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    title="Move up"
                  >
                    <ArrowUp className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSection && onMoveSection(section.id, 'down');
                    }}
                    disabled={index === sections.length - 1}
                    className="p-0.5 lg:p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    title="Move down"
                  >
                    <ArrowDown className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSection && onEditSection(section);
                    }}
                    className="p-0.5 lg:p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors duration-150"
                    title="Edit section"
                  >
                    <Edit className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection && onDeleteSection(section.id);
                    }}
                    className="p-0.5 lg:p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                    title="Delete section"
                  >
                    <Trash2 className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="section-title" className="block text-sm font-semibold text-gray-800 mb-2">
          Section Title
        </label>
        <input
          type="text"
          id="section-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-2.5 px-3 transition-all duration-200 bg-white"
          placeholder="Enter section title..."
          required
        />
      </div>
      <div>
        <label htmlFor="section-icon" className="block text-sm font-semibold text-gray-800 mb-2">
          Icon
        </label>
        <div className="relative">
          <select
            id="section-icon"
            value={iconName}
            onChange={(e) => setIconName(e.target.value)}
            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-2.5 px-3 pr-10 transition-all duration-200 appearance-none bg-white"
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
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronUpIcon className="h-4 w-4 text-gray-400 rotate-180" />
          </div>
        </div>
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Preview:</span>
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              {(() => {
                const Icon = getIconComponent(iconName);
                return <Icon className="h-5 w-5 text-white" />;
              })()}
            </div>
            <span className="text-sm text-gray-600">{iconName}</span>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="section-order" className="block text-sm font-semibold text-gray-800 mb-2">Display Order</label>
        <input
          type="number"
          id="section-order"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
          min="1"
          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm py-2.5 px-3 transition-all duration-200 bg-white"
          placeholder="1"
          required
        />
      </div>
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {section?.id === 'new' ? 'Create Section' : 'Save Section'}
        </button>
      </div>
    </form>
  );
};

const EditHelpContentForm: React.FC<EditHelpContentFormProps> = ({ item, onSave, onCancel }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [contentParagraphs, setContentParagraphs] = useState<string[]>(
    item?.content || ['']
  );
  const [order, setOrder] = useState(item?.order || 0);

  useEffect(() => {
    setTitle(item?.title || '');
    setContentParagraphs(item?.content || ['']);
    setOrder(item?.order || 0);
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      onSave({
        ...item,
        title,
        content: contentParagraphs.filter(p => p.trim() !== ''),
        order
      });
    }
  };

  const addParagraph = () => {
    setContentParagraphs([...contentParagraphs, '']);
  };

  const removeParagraph = (index: number) => {
    setContentParagraphs(contentParagraphs.filter((_, i) => i !== index));
  };

  const updateParagraph = (index: number, value: string) => {
    const updated = [...contentParagraphs];
    updated[index] = value;
    setContentParagraphs(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="edit-title" className="block text-sm font-semibold text-gray-800 mb-2">Content Title</label>
        <input
          type="text"
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
          placeholder="Enter content title"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-800">
            Content Paragraphs
          </label>
          <span className="text-xs text-gray-500">
            {contentParagraphs.filter(p => p.trim()).length} paragraph{contentParagraphs.filter(p => p.trim()).length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-3">
          {contentParagraphs.map((paragraph, index) => (
            <div key={index} className="group">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mt-1">
                  <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={paragraph}
                    onChange={(e) => updateParagraph(index, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none bg-white shadow-sm"
                    rows={3}
                    placeholder={`Enter paragraph ${index + 1} content...`}
                  />
                </div>
                {contentParagraphs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParagraph(index)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Remove paragraph"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addParagraph}
          className="mt-4 inline-flex items-center px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 text-sm font-medium border border-blue-200 hover:border-blue-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Paragraph
        </button>
      </div>

      <div>
        <label htmlFor="edit-order" className="block text-sm font-semibold text-gray-800 mb-2">Display Order</label>
        <input
          type="number"
          id="edit-order"
          value={order}
          onChange={(e) => setOrder(parseInt(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
          min="0"
          placeholder="0"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
        >
          {item?.id === 'new' ? 'Create Content' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

interface HelpMainContentProps {
  currentSectionDetails?: HelpSection;
  contentToDisplay: HelpContentItem[];
  searchTerm: string;
  onEditClick: (item: HelpContentItem) => void;
  onDeleteClick: (id: string) => void;
}


const Help = () => {
  const { trackPageView } = useActivityTracking();
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
    trackPageView('Help');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex h-screen overflow-hidden">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:shadow-xl"
          >
            <BookOpen className="h-5 w-5 text-gray-600" />
          </button>

          {/* Mobile overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity duration-300"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:relative z-25 w-72 sm:w-80 lg:w-80 xl:w-96 transition-transform duration-300 ease-in-out h-full`}>
            <HelpSidebar 
              sections={sections}
              activeSection={activeSection}
              setActiveSection={(section) => {
                setActiveSection(section);
                setIsMobileSidebarOpen(false); // Close sidebar on mobile after selection
              }}
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
          </div>

          {/* Main content */}
          <div className="flex-1 lg:ml-0 overflow-hidden">
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
          <Dialog as="div" className="relative z-50" onClose={closeEditModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />
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
                  <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-semibold text-gray-900 flex items-center"
                      >
                        <div className="p-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg mr-3">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                         Edit Help Content
                      </Dialog.Title>
                      <p className="text-sm text-gray-600 mt-1">
                        Update the content information below
                      </p>
                    </div>
                    <div className="p-6">
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
          <Dialog as="div" className="relative z-50" onClose={closeSectionEditModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/70 backdrop-blur-md" />
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
                  <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
                    <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 px-6 py-4 border-b border-gray-100">
                      <Dialog.Title
                        as="h3"
                        className="text-xl font-semibold text-gray-900 flex items-center"
                      >
                        <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg mr-3">
                           <SettingsIcon className="h-6 w-6 text-white" />
                         </div>
                         {editingSection ? 'Edit Section' : 'Add New Section'}
                      </Dialog.Title>
                      <p className="text-sm text-gray-600 mt-1">
                        {editingSection ? 'Update the section information below' : 'Create a new help section'}
                      </p>
                    </div>
                    <div className="p-6">
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