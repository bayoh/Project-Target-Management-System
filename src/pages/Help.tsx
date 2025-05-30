import { useState, useMemo } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon, BookOpen, LayoutDashboard, Briefcase, Target, AlertTriangle, FileText, Users, Settings as SettingsIcon, Search, Icon as LucideIcon } from 'lucide-react'; 
import { DashboardLayout } from '../components/layout/DashboardLayout';
import userManualData from './helpContent.json'; // Import the JSON data

interface HelpSectionItem {
  title: string;
  content: string[];
}

interface HelpSection {
  id: string;
  title: string;
  icon: LucideIcon;
}

interface UserManualContent {
  [key: string]: HelpSectionItem[];
}

const userManualContent: UserManualContent = userManualData;

// Sidebar Component
interface HelpSidebarProps {
  sections: HelpSection[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const HelpSidebar: React.FC<HelpSidebarProps> = ({ sections, activeSection, setActiveSection, searchTerm, setSearchTerm }) => (
  <aside className="lg:col-span-3 py-6 lg:py-0">
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

// Main Content Component
interface HelpMainContentProps {
  currentSectionDetails?: HelpSection;
  contentToDisplay: HelpSectionItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const HelpMainContent: React.FC<HelpMainContentProps> = ({ currentSectionDetails, contentToDisplay, searchTerm, setSearchTerm }) => (
  <main className="lg:col-span-9 mt-6 lg:mt-0">
    <div className="bg-white shadow-xl sm:rounded-xl overflow-hidden">
      <div className="px-6 py-8 sm:p-10">
        {currentSectionDetails && (
          <div className="flex items-center mb-8">
            <currentSectionDetails.icon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">
              {currentSectionDetails.title}
            </h1>
          </div>
        )}

        {contentToDisplay.length > 0 ? (
          <div className="space-y-6">
            {contentToDisplay.map((section, idx) => (
              <Disclosure key={idx} as="div" className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                {({ open }) => (
                  <>
                    <Disclosure.Button className="flex w-full items-center justify-between px-5 py-4 text-left text-md font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 rounded-t-lg">
                      <span>{section.title}</span>
                      <ChevronUpIcon
                        className={`${open ? 'rotate-180 transform' : ''} h-6 w-6 text-indigo-500 transition-transform duration-200`}
                      />
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-6 pt-4 pb-5 text-sm text-gray-700 border-t border-gray-200">
                      {section.content.map((line, i) => {
                        if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
                          const isOrdered = line.match(/^\d+\.\s/);
                          const itemContent = line.replace(/^(- |\d+\.\s)/, '');
                          return isOrdered ? (
                            <ol key={i} className="list-decimal list-inside ml-4 mb-1 space-y-1">
                              <li>{itemContent}</li>
                            </ol>
                          ) : (
                            <ul key={i} className="list-disc list-inside ml-4 mb-1 space-y-1">
                              <li>{itemContent}</li>
                            </ul>
                          );
                        }
                        return (
                          <p key={i} className="mb-2 whitespace-pre-line">
                            {line}
                          </p>
                        );
                      })}
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">Your search for "{searchTerm}" did not match any help content in this section.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Clear search
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </main>
);

const Help = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');

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
    const sectionContent = userManualContent[activeSection] || [];
    if (!searchTerm) return sectionContent;

    return sectionContent.map(subSection => ({
      ...subSection,
      content: subSection.content.filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
    })).filter(subSection => subSection.content.length > 0);
  }, [currentSectionDetails, activeSection, searchTerm]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
            <HelpSidebar 
              sections={sections}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
            <HelpMainContent 
              currentSectionDetails={currentSectionDetails}
              contentToDisplay={contentToDisplay}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Help;