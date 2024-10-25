import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateLLM, generatePrompt } from '../utils/llmUtils';
import { Mode } from './ModeSelector';
import Navbar from './Navbar';
import { RetellWebClient } from 'retell-client-js-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Box, Input, VStack, Text, useToast } from '@chakra-ui/react';
import { Send, Podcast } from 'lucide-react';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const YOUR_API_KEY = 'key_1d2025c27c6328b3f9840255e4df';
const webClient = new RetellWebClient();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PromptChangeResponse {
  prompt: string;
  summary: string;
}

export default function Brain() {
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(true);
  const [selectedMode, setSelectedMode] = useState<Mode>('customer');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState<PromptChangeResponse | null>(null);
  const [showInterface, setShowInterface] = useState(false);
  const [callStatus, setCallStatus] = useState<'not-started' | 'active' | 'inactive'>('not-started');
  const [agentData, setAgentData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAgentData(data[`${selectedMode}AgentData`] || null);
        }
      }
    };
    loadUserData();
  }, [selectedMode]);

  useEffect(() => {
    const handleConversationStarted = () => {
      setCallStatus('active');
    };

    const handleConversationEnded = () => {
      setCallStatus('inactive');
    };

    const handleError = (error: any) => {
      console.error('An error occurred:', error);
      setCallStatus('inactive');
    };

    webClient.on('conversationStarted', handleConversationStarted);
    webClient.on('conversationEnded', handleConversationEnded);
    webClient.on('error', handleError);

    return () => {
      webClient.off('conversationStarted', handleConversationStarted);
      webClient.off('conversationEnded', handleConversationEnded);
      webClient.off('error', handleError);
    };
  }, []);

  const toggleConversation = async () => {
    if (callStatus === 'active') {
      try {
        await webClient.stopCall();
        setCallStatus('inactive');
      } catch (error) {
        console.error('Error stopping call:', error);
      }
    } else {
      if (!agentData) {
        console.error('Agent not created yet');
        return;
      }

      try {
        const response = await fetch(
          'https://api.retellai.com/v2/create-web-call',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${YOUR_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agent_id: agentData.agent_id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        await webClient.startCall({
          accessToken: data.access_token,
          callId: data.call_id,
          sampleRate: 16000,
          enableUpdate: true,
        });
        setCallStatus('active');
      } catch (error) {
        console.error('Error starting call:', error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const extractJSONFromResponse = (text: string): PromptChangeResponse => {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          if (result.prompt && result.summary) {
            return result;
          }
        } catch (e) {
          throw new Error('Invalid JSON structure in response');
        }
      }
      throw new Error('No valid JSON found in response');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setIsLoading(true);
      setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
      setInputMessage('');

      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const currentPrompt = userData[`${selectedMode}GeneralPrompt`] || generatePrompt(userData, selectedMode);

      const systemPrompt = `You are a prompt engineering expert. Your task is to modify the provided prompt while preserving all variables (marked with ${{}}) exactly as they are. Format your response as a JSON object with exactly these fields:
{
  "prompt": "the modified prompt",
  "summary": "a brief summary of the changes made"
}

Current prompt:
${currentPrompt}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: inputMessage }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI');
      }

      const result = extractJSONFromResponse(data.choices[0].message.content);

      setPendingChange(result);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Here's what I understand you want to change:\n\n${result.summary}\n\nWould you like me to apply these changes?` 
      }]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error: ${error.message}. Please try again with a different request.` 
      }]);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to process your request',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmChange = async (confirmed: boolean) => {
    if (!confirmed || !pendingChange) {
      setPendingChange(null);
      setMessages([]);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, {
        [`${selectedMode}GeneralPrompt`]: pendingChange.prompt
      });

      await updateLLM(user.uid, selectedMode);

      toast({
        title: 'Success',
        description: 'Prompt updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setPendingChange(null);
      setMessages([]);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update prompt',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navbar
        onOpenCallerConfig={() => {}}
        onOpenEditRestaurantInfo={() => {}}
        isExpanded={isNavbarExpanded}
        setIsExpanded={setIsNavbarExpanded}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
      />
      <div className={`flex-grow p-8 transition-all duration-300 ${isNavbarExpanded ? 'ml-64' : 'ml-20'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-blue-900">Brain Interface</h1>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold capitalize">
              {selectedMode} Mode
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!showInterface ? (
              <motion.div
                key="brain"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-8"
                style={{ minHeight: 'calc(100vh - 200px)' }}
              >
                <motion.div
                  className="cursor-pointer"
                  onClick={() => setShowInterface(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg
                    viewBox="0 0 500 500"
                    className="w-64 h-64 brain-svg"
                  >
                    <defs>
                      <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      className="brain-path"
                      d="M250,50 C100,50 50,150 50,250 C50,350 100,450 250,450 C400,450 450,350 450,250 C450,150 400,50 250,50 Z"
                      fill="url(#brainGradient)"
                      filter="url(#glow)"
                    />
                    <path
                      className="synapse-path"
                      d="M100,250 C200,150 300,350 400,250"
                      stroke="#8B5CF6"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="synapse-path"
                      d="M100,200 C200,300 300,100 400,200"
                      stroke="#8B5CF6"
                      strokeWidth="4"
                      fill="none"
                    />
                  </svg>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl text-gray-600"
                >
                  Click the brain to start modifying your AI's intelligence
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="interface"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Box
                    bg="white"
                    borderRadius="lg"
                    boxShadow="lg"
                    p={6}
                    height="70vh"
                    display="flex"
                    flexDirection="column"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">Prompt Engineer</h2>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={() => setShowInterface(false)}
                      >
                        Back to Brain
                      </Button>
                    </div>
                    <VStack
                      flex="1"
                      overflowY="auto"
                      spacing={4}
                      align="stretch"
                      className="custom-scrollbar"
                    >
                      {messages.map((message, index) => (
                        <Box
                          key={index}
                          alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                          bg={message.role === 'user' ? 'blue.500' : 'gray.100'}
                          color={message.role === 'user' ? 'white' : 'black'}
                          px={4}
                          py={2}
                          borderRadius="lg"
                          maxW="80%"
                        >
                          <Text whiteSpace="pre-wrap">{message.content}</Text>
                        </Box>
                      ))}
                      {pendingChange && (
                        <Box display="flex" justifyContent="center" gap={4} mt={4}>
                          <Button
                            colorScheme="green"
                            onClick={() => handleConfirmChange(true)}
                          >
                            Yes, apply changes
                          </Button>
                          <Button
                            colorScheme="red"
                            variant="outline"
                            onClick={() => handleConfirmChange(false)}
                          >
                            No, start over
                          </Button>
                        </Box>
                      )}
                      <div ref={messagesEndRef} />
                    </VStack>

                    <Box pt={4} borderTop="1px" borderColor="gray.200">
                      <div className="flex gap-2">
                        <Input
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Type your prompt modification request..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          disabled={isLoading || !!pendingChange}
                        />
                        <Button
                          colorScheme="blue"
                          onClick={handleSendMessage}
                          isLoading={isLoading}
                          disabled={!inputMessage.trim() || !!pendingChange}
                        >
                          <Send size={20} />
                        </Button>
                      </div>
                    </Box>
                  </Box>

                  <Box
                    bg="white"
                    borderRadius="lg"
                    boxShadow="lg"
                    p={6}
                    height="70vh"
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <h2 className="text-xl font-semibold text-gray-800 mb-8">Test Your Changes</h2>
                    <div
                      className="relative cursor-pointer"
                      onClick={toggleConversation}
                    >
                      <motion.div
                        animate={{
                          scale: callStatus === 'active' ? [1, 1.1, 1] : 1,
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: callStatus === 'active' ? Infinity : 0,
                          repeatType: 'reverse',
                        }}
                      >
                        <div
                          className={`rounded-full p-16 ${
                            callStatus === 'active' ? 'bg-[#92d0ff]' : 'bg-white'
                          } shadow-lg ${
                            callStatus === 'active'
                              ? 'shadow-[#92d0ff]'
                              : 'shadow-blue-200'
                          }`}
                        >
                          <motion.div
                            animate={{
                              rotate: callStatus === 'active' ? [0, 360] : 0,
                            }}
                            transition={{
                              duration: 2,
                              repeat: callStatus === 'active' ? Infinity : 0,
                              ease: 'linear',
                            }}
                          >
                            <Podcast
                              size={110}
                              color={callStatus === 'active' ? 'white' : '#92d0ff'}
                            />
                          </motion.div>
                        </div>
                      </motion.div>
                      {callStatus === 'active' && (
                        <motion.div
                          className="absolute -inset-3 rounded-full bg-[#92d0ff] opacity-50"
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          }}
                        />
                      )}
                    </div>
                    <p className="text-gray-600 mt-8">
                      {callStatus === 'active'
                        ? 'Click to end the call'
                        : 'Click to test your AI assistant'}
                    </p>
                  </Box>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .brain-svg {
          filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3));
        }

        .brain-path {
          animation: pulse 2s infinite;
        }

        .synapse-path {
          animation: flash 2s infinite;
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
        }

        @keyframes pulse {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.2); }
          100% { transform: scale(1); filter: brightness(1); }
        }

        @keyframes flash {
          0% { opacity: 0.3; stroke-dashoffset: 400; }
          50% { opacity: 1; stroke-dashoffset: 0; }
          100% { opacity: 0.3; stroke-dashoffset: -400; }
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}