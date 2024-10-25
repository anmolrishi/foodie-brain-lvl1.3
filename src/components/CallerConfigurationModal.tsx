import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { generatePrompt } from '../utils/llmUtils';
import { Mode } from './ModeSelector';

const YOUR_API_KEY = 'key_1d2025c27c6328b3f9840255e4df';

interface LLMData {
  llm_id: string;
  llm_websocket_url: string;
}

interface CallerConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  beginMessage: string;
  model: string;
  botName: string;
  tone: string;
  callTransferNumber: string;
  llmData: LLMData | null;
  mode: Mode;
  setBeginMessage: React.Dispatch<React.SetStateAction<string>>;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setBotName: React.Dispatch<React.SetStateAction<string>>;
  setTone: React.Dispatch<React.SetStateAction<string>>;
  setCallTransferNumber: React.Dispatch<React.SetStateAction<string>>;
  setLLMData: React.Dispatch<React.SetStateAction<LLMData | null>>;
}

export default function CallerConfigurationModal({
  isOpen,
  onClose,
  beginMessage,
  model,
  botName,
  tone,
  callTransferNumber,
  llmData,
  mode,
  setBeginMessage,
  setModel,
  setBotName,
  setTone,
  setCallTransferNumber,
  setLLMData,
}: CallerConfigurationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBeginMessage, setEditedBeginMessage] = useState(beginMessage);
  const [editedModel, setEditedModel] = useState(model);
  const [editedBotName, setEditedBotName] = useState(botName);
  const [editedTone, setEditedTone] = useState(tone);
  const [editedCallTransferNumber, setEditedCallTransferNumber] = useState(callTransferNumber);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedBeginMessage(beginMessage);
    setEditedModel(model);
    setEditedBotName(botName);
    setEditedTone(tone);
    setEditedCallTransferNumber(callTransferNumber);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !llmData) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const generalPrompt = generatePrompt({
        ...userData,
        [`${mode}BotName`]: editedBotName,
        [`${mode}Tone`]: editedTone,
      }, mode);

      const response = await fetch(
        `https://api.retellai.com/update-retell-llm/${llmData.llm_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${YOUR_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: editedModel,
            general_prompt: generalPrompt,
            begin_message: editedBeginMessage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedLLMData = await response.json();

      await setDoc(
        userDocRef,
        {
          [`${mode}BeginMessage`]: editedBeginMessage,
          [`${mode}Model`]: editedModel,
          [`${mode}BotName`]: editedBotName,
          [`${mode}Tone`]: editedTone,
          [`${mode}LlmData`]: updatedLLMData,
        },
        { merge: true }
      );

      setBeginMessage(editedBeginMessage);
      setModel(editedModel);
      setBotName(editedBotName);
      setTone(editedTone);
      setLLMData(updatedLLMData);
      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Error updating caller configuration:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-blue-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">
            {mode.charAt(0).toUpperCase() + mode.slice(1)} Bot Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-blue-500 hover:text-blue-700 transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label htmlFor="botName" className="block text-sm font-medium text-gray-700 mb-1">
              Bot Name
            </label>
            {isEditing ? (
              <input
                id="botName"
                type="text"
                value={editedBotName}
                onChange={(e) => setEditedBotName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-900">{botName}</p>
            )}
          </div>
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
              Tone
            </label>
            {isEditing ? (
              <select
                id="tone"
                value={editedTone}
                onChange={(e) => setEditedTone(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            ) : (
              <p className="text-gray-900">{tone}</p>
            )}
          </div>
          <div>
            <label htmlFor="beginMessage" className="block text-sm font-medium text-gray-700 mb-1">
              Begin Message
            </label>
            {isEditing ? (
              <textarea
                id="beginMessage"
                value={editedBeginMessage}
                onChange={(e) => setEditedBeginMessage(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            ) : (
              <p className="text-gray-900">{beginMessage}</p>
            )}
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            {isEditing ? (
              <select
                id="model"
                value={editedModel}
                onChange={(e) => setEditedModel(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o-Mini</option>
                <option value="claude-3.5-sonnet">Claude-3.5-Sonnet</option>
                <option value="claude-3-haiku">Claude-3-Haiku</option>
              </select>
            ) : (
              <p className="text-gray-900">{model}</p>
            )}
          </div>
          <div className="flex justify-end space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}