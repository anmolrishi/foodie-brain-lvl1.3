import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Phone, Settings, PhoneCall, ChevronLeft, ChevronRight, LogOut, BarChart2, Home, Brain, ChevronDown } from 'lucide-react';
import { Mode } from './ModeSelector';

interface NavbarProps {
  onOpenCallerConfig: () => void;
  onOpenEditRestaurantInfo: () => void;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function Navbar({ 
  onOpenCallerConfig, 
  onOpenEditRestaurantInfo, 
  isExpanded, 
  setIsExpanded,
  selectedMode,
  onModeChange
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('An error occurred while signing out. Please try again.');
    }
  };

  const modeIcons = {
    customer: '👥',
    operations: '⚙️',
    sales: '💼'
  };

  const modeDescriptions = {
    customer: 'Handle customer inquiries and reservations',
    operations: 'Manage internal operations and staff',
    sales: 'Handle business and partnership inquiries'
  };

  return (
    <nav className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-gray-200">
          {isExpanded ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="h-8 w-8 text-blue-600 mr-3" />
                  <h1 className="text-xl font-bold text-black">FoodieBot</h1>
                </div>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-600 hover:text-blue-600 transition-colors duration-300"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  className="w-full flex items-center p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all duration-200"
                >
                  <span className="text-xl mr-3">{modeIcons[selectedMode]}</span>
                  <div className="text-left flex-grow">
                    <div className="font-medium capitalize">{selectedMode}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{modeDescriptions[selectedMode]}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>

                {showModeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {(['customer', 'operations', 'sales'] as Mode[])
                      .filter(mode => mode !== selectedMode)
                      .map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            onModeChange(mode);
                            setShowModeDropdown(false);
                          }}
                          className="w-full flex items-center p-3 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <span className="text-xl mr-3">{modeIcons[mode]}</span>
                          <div className="text-left">
                            <div className="font-medium capitalize">{mode}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{modeDescriptions[mode]}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Phone className="h-8 w-8 text-blue-600 mb-4" />
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-300"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-grow py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full flex items-center px-6 py-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <Home className="h-6 w-6" strokeWidth={1.5} />
            {isExpanded && <span className="ml-3 font-semibold">Dashboard</span>}
          </button>

          <button
            onClick={onOpenCallerConfig}
            className={`w-full flex items-center px-6 py-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <PhoneCall className="h-6 w-6" strokeWidth={1.5} />
            {isExpanded && <span className="ml-3 font-semibold">Bot Config</span>}
          </button>

          <button
            onClick={onOpenEditRestaurantInfo}
            className={`w-full flex items-center px-6 py-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <Settings className="h-6 w-6" strokeWidth={1.5} />
            {isExpanded && <span className="ml-3 font-semibold">Restaurant Info</span>}
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className={`w-full flex items-center px-6 py-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <BarChart2 className="h-6 w-6" strokeWidth={1.5} />
            {isExpanded && <span className="ml-3 font-semibold">Analytics</span>}
          </button>

          <button
            onClick={() => navigate('/brain')}
            className={`w-full flex items-center px-6 py-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
          >
            <Brain className="h-6 w-6" strokeWidth={1.5} />
            {isExpanded && <span className="ml-3 font-semibold">Brain</span>}
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center px-6 py-4 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
        >
          <LogOut className="h-6 w-6" strokeWidth={1.5} />
          {isExpanded && <span className="ml-3 font-semibold">Sign Out</span>}
        </button>
      </div>
    </nav>
  );
}