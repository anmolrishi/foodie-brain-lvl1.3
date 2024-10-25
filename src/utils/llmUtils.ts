import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const YOUR_API_KEY = 'key_1d2025c27c6328b3f9840255e4df';

type Mode = 'customer' | 'operations' | 'sales';

export function generatePrompt(userData: any, mode: Mode): string {
  // If a custom prompt exists for this mode, use it
  if (userData[`${mode}GeneralPrompt`]) {
    return userData[`${mode}GeneralPrompt`];
  }

  // Otherwise, generate the default prompt
  const basePrompt = `You are an AI assistant caller for a restaurant named ${userData.restaurantName}. Your name is ${userData[`${mode}BotName`]}. You should maintain a ${userData[`${mode}Tone`]} tone throughout the conversation.

The details of the restaurant are:

Restaurant Name: ${userData.restaurantName}
Seating Capacity: ${userData.seatingCapacity}
Address: ${userData.address}

Menu:
${userData.menu}`;

  // Add mode-specific prompts
  const modePrompts = {
    customer: `Your role is to assist callers with inquiries about the restaurant, take reservations, and provide information about the menu and services.`,
    operations: `Your role is to assist with internal operations, including inventory management, staff scheduling, and kitchen coordination.`,
    sales: `Your role is to handle business inquiries, catering requests, and partnership opportunities.`
  };

  return `${basePrompt}

${modePrompts[mode]}

Please use this information to assist callers accurately. If asked about matters outside your domain, politely redirect them to the appropriate department. Always maintain a ${userData[`${mode}Tone`]} tone throughout the conversation.`;
}

export async function updateLLM(userId: string, mode: Mode) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    const generalPrompt = generatePrompt(userData, mode);
    const llmData = userData[`${mode}LlmData`];

    if (!llmData) {
      throw new Error(`LLM data not found for mode: ${mode}`);
    }

    const response = await fetch(
      `https://api.retellai.com/update-retell-llm/${llmData.llm_id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${YOUR_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: userData[`${mode}Model`],
          general_prompt: generalPrompt,
          begin_message: userData[`${mode}BeginMessage`],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedLLMData = await response.json();

    await updateDoc(userDocRef, {
      [`${mode}LlmData`]: updatedLLMData,
    });

    console.log(`${mode} LLM updated successfully`);
  } catch (error) {
    console.error(`Error updating ${mode} LLM:`, error);
    throw error;
  }
}

export async function createLLMAndAgent(restaurantData: any, mode: Mode) {
  try {
    const generalPrompt = generatePrompt(restaurantData, mode);

    const llmResponse = await fetch(
      'https://api.retellai.com/create-retell-llm',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${YOUR_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: restaurantData[`${mode}Model`],
          general_prompt: generalPrompt,
          begin_message: restaurantData[`${mode}BeginMessage`],
        }),
      }
    );

    if (!llmResponse.ok) {
      throw new Error(`HTTP error! status: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();

    const agentResponse = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${YOUR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        llm_websocket_url: llmData.llm_websocket_url,
        agent_name: restaurantData[`${mode}BotName`],
        voice_id: '11labs-Adrian',
        language: 'en-US',
      }),
    });

    if (!agentResponse.ok) {
      throw new Error(`HTTP error! status: ${agentResponse.status}`);
    }

    const agentData = await agentResponse.json();

    return {
      llmData,
      agentData,
    };
  } catch (error) {
    console.error(`Error creating ${mode} LLM and agent:`, error);
    throw error;
  }
}