import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateLLM } from '../utils/llmUtils';
import { Mode } from './ModeSelector';

interface EditRestaurantInfoProps {
  onClose: () => void;
  onUpdateRestaurantName: (newName: string) => void;
}

export default function EditRestaurantInfo({ onClose, onUpdateRestaurantName }: EditRestaurantInfoProps) {
  const [restaurantName, setRestaurantName] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [address, setAddress] = useState('');
  const [menu, setMenu] = useState('');
  const [newMenuFile, setNewMenuFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setRestaurantName(data.restaurantName || '');
          setSeatingCapacity(data.seatingCapacity?.toString() || '');
          setAddress(data.address || '');
          setMenu(data.menu || '');
        }
      }
    };
    fetchRestaurantInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const updateData: any = {
          restaurantName,
          seatingCapacity: parseInt(seatingCapacity),
          address,
        };
        if (newMenuFile) {
          updateData.menu = await newMenuFile.text();
        }
        await updateDoc(userDocRef, updateData);
        
        // Update all three LLMs
        const modes: Mode[] = ['customer', 'operations', 'sales'];
        await Promise.all(modes.map(mode => updateLLM(user.uid, mode)));
        
        onUpdateRestaurantName(restaurantName);
        onClose();
      } catch (error) {
        console.error('Error updating restaurant information:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">Edit Restaurant Information</h2>
          <button onClick={onClose} className="text-blue-500 hover:text-blue-700 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant Name
            </label>
            <input
              id="restaurantName"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="seatingCapacity" className="block text-sm font-medium text-gray-700 mb-1">
              Seating Capacity
            </label>
            <input
              id="seatingCapacity"
              type="number"
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="menu" className="block text-sm font-medium text-gray-700 mb-1">
              Menu (txt file)
            </label>
            <input
              id="menu"
              type="file"
              accept=".txt"
              onChange={(e) => setNewMenuFile(e.target.files?.[0] || null)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {menu && (
              <p className="mt-2 text-sm text-gray-500">
                Current menu file: {menu.substring(0, 20)}...
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}