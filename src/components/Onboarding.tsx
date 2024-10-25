import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createLLMAndAgent } from '../utils/llmUtils';
import { Alert, AlertIcon, AlertTitle, CloseButton } from '@chakra-ui/react';

type Mode = 'customer' | 'operations' | 'sales';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [restaurantName, setRestaurantName] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [address, setAddress] = useState('');
  const [menu, setMenu] = useState<File | null>(null);
  
  // Bot configuration for each mode
  const [botConfigs, setBotConfigs] = useState<Record<Mode, {
    botName: string;
    tone: string;
    beginMessage: string;
    model: string;
  }>>({
    customer: {
      botName: '',
      tone: 'friendly',
      beginMessage: '',
      model: 'gpt-4o'
    },
    operations: {
      botName: '',
      tone: 'professional',
      beginMessage: '',
      model: 'gpt-4o'
    },
    sales: {
      botName: '',
      tone: 'professional',
      beginMessage: '',
      model: 'gpt-4o'
    }
  });

  const [alert, setAlert] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserDocument = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            createdAt: new Date(),
          });
        }
      }
    };

    checkUserDocument();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const updateBotConfig = (mode: Mode, field: keyof typeof botConfigs[Mode], value: string) => {
    setBotConfigs(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const menuText = menu ? await menu.text() : '';
      
      // Base restaurant data
      const restaurantData = {
        restaurantName,
        seatingCapacity: parseInt(seatingCapacity),
        address,
        menu: menuText,
      };

      // Create LLM and agent for each mode
      const modes: Mode[] = ['customer', 'operations', 'sales'];
      const llmAgentData: Record<Mode, { llmData: any; agentData: any }> = {} as any;

      for (const mode of modes) {
        const modeData = {
          ...restaurantData,
          [`${mode}BotName`]: botConfigs[mode].botName,
          [`${mode}Tone`]: botConfigs[mode].tone,
          [`${mode}BeginMessage`]: botConfigs[mode].beginMessage,
          [`${mode}Model`]: botConfigs[mode].model,
        };

        const { llmData, agentData } = await createLLMAndAgent(modeData, mode);
        llmAgentData[mode] = { llmData, agentData };
      }

      // Prepare final data for Firestore
      const finalData = {
        ...restaurantData,
        ...Object.entries(botConfigs).reduce((acc, [mode, config]) => ({
          ...acc,
          [`${mode}BotName`]: config.botName,
          [`${mode}Tone`]: config.tone,
          [`${mode}BeginMessage`]: config.beginMessage,
          [`${mode}Model`]: config.model,
        }), {}),
        ...Object.entries(llmAgentData).reduce((acc, [mode, data]) => ({
          ...acc,
          [`${mode}LlmData`]: data.llmData,
          [`${mode}AgentData`]: data.agentData,
        }), {}),
      };

      // Update Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, finalData, { merge: true });

      setAlert({
        status: 'success',
        message: 'Onboarding complete. Your restaurant information has been saved successfully.',
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      setAlert({
        status: 'error',
        message: 'An error occurred while saving your information. Please try again.',
      });
    }
  };

  const renderRestaurantInfoForm = () => (
    <>
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
          onChange={(e) => setMenu(e.target.files?.[0] || null)}
          required
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </>
  );

  const renderBotConfigForm = () => (
    <div className="space-y-6">
      {(['customer', 'operations', 'sales'] as Mode[]).map((mode) => (
        <div key={mode} className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">{mode} Bot Configuration</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor={`${mode}BotName`} className="block text-sm font-medium text-gray-700 mb-1">
                Bot Name
              </label>
              <input
                id={`${mode}BotName`}
                type="text"
                value={botConfigs[mode].botName}
                onChange={(e) => updateBotConfig(mode, 'botName', e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor={`${mode}Tone`} className="block text-sm font-medium text-gray-700 mb-1">
                Tone
              </label>
              <select
                id={`${mode}Tone`}
                value={botConfigs[mode].tone}
                onChange={(e) => updateBotConfig(mode, 'tone', e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${mode}BeginMessage`} className="block text-sm font-medium text-gray-700 mb-1">
                Begin Message
              </label>
              <textarea
                id={`${mode}BeginMessage`}
                value={botConfigs[mode].beginMessage}
                onChange={(e) => updateBotConfig(mode, 'beginMessage', e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor={`${mode}Model`} className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                id={`${mode}Model`}
                value={botConfigs[mode].model}
                onChange={(e) => updateBotConfig(mode, 'model', e.target.value)}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o-Mini</option>
                <option value="claude-3.5-sonnet">Claude-3.5-Sonnet</option>
                <option value="claude-3-haiku">Claude-3-Haiku</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {step === 1 ? 'Restaurant Information' : 'Bot Configuration'}
      </h2>
      {alert && (
        <Alert status={alert.status} mb={4}>
          <AlertIcon />
          <AlertTitle mr={2}>{alert.message}</AlertTitle>
          <CloseButton position="absolute" right="8px" top="8px" onClick={() => setAlert(null)} />
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 ? renderRestaurantInfoForm() : renderBotConfigForm()}
        <div className="flex justify-between">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save and Continue
            </button>
          )}
        </div>
      </form>
    </div>
  );
}