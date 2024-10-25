import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  BarChart,
  Menu,
  Cpu,
} from 'lucide-react';
import { RetellWebClient } from 'retell-client-js-sdk';

const webClient = new RetellWebClient();
const YOUR_API_KEY = '02e501b4-1b05-40f4-af3e-351f0819e13f';

const styles = `
  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-bounce-subtle {
    animation: bounce-subtle 2s infinite;
  }
`;

export default function LandingPage() {
  const [callStatus, setCallStatus] = useState<
    'not-started' | 'active' | 'inactive'
  >('not-started');
  const navigate = useNavigate();

  useEffect(() => {
    webClient.on('conversationStarted', () => {
      console.log('Conversation started');
      setCallStatus('active');
    });

    webClient.on('conversationEnded', ({ code, reason }) => {
      console.log('Conversation ended with code:', code, ', reason:', reason);
      setCallStatus('inactive');
    });

    webClient.on('error', (error) => {
      console.error('An error occurred:', error);
      setCallStatus('inactive');
    });

    webClient.on('update', (update) => {
      if (update.type === 'transcript' && update.transcript) {
        console.log(`${update.transcript.speaker}: ${update.transcript.text}`);
      }
    });
  }, []);

  const toggleConversation = async () => {
    if (callStatus === 'active') {
      webClient.stopCall();
      setCallStatus('inactive');
    } else {
      const agentId = 'agent_6d2eaae13a8c7686a721346017'; // Default agent ID
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
              agent_id: agentId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        webClient
          .startCall({
            accessToken: data.access_token,
            callId: data.call_id,
            sampleRate: 48000,
            enableUpdate: true,
          })
          .catch(console.error);
        setCallStatus('active');
      } catch (error) {
        console.error('Error starting call:', error);
      }
    }
  };

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="flex flex-col min-h-screen font-sans">
      <style>{styles}</style>
      <div className="relative flex-1 bg-gradient-to-br from-white to-gray-100">
        <div className="relative z-10">
          <header className="px-4 lg:px-6 h-16 flex items-center bg-white shadow-sm">
            <a href="#" className="flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-800" />
              <span className="ml-2 text-xl font-bold text-blue-900">
                FoodieBot
              </span>
            </a>
            <nav className="ml-auto flex gap-4 sm:gap-6">
              <a
                className="text-sm font-medium text-blue-800 hover:text-blue-900"
                href="#features"
              >
                Features
              </a>
              <a
                className="text-sm font-medium text-blue-800 hover:text-blue-900"
                href="#how-it-works"
              >
                How It Works
              </a>
              <a
                className="text-sm font-medium text-blue-800 hover:text-blue-900"
                href="#get-started"
              >
                Get Started
              </a>
            </nav>
          </header>
          <main>
            <section className="py-12 md:py-24 lg:py-32 xl:py-48">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center space-y-12 max-w-3xl mx-auto">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-blue-800 sm:text-5xl md:text-6xl">
                      FoodieBot: Your AI-Powered Restaurant Assistant
                    </h1>
                    <p className="text-xl text-gray-800 max-w-2xl mx-auto">
                      Revolutionize your restaurant's customer service with
                      FoodieBot. Handle orders, answer queries, and provide
                      real-time support via calls.
                    </p>
                  </div>
                  <div className="flex flex-col items-center space-y-6">
                    <button
                      onClick={toggleConversation}
                      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        callStatus === 'active'
                          ? 'bg-red-500 animate-bounce-subtle'
                          : 'bg-blue-100 hover:bg-blue-200'
                      }`}
                    >
                      <Mic
                        className={`h-16 w-16 ${
                          callStatus === 'active'
                            ? 'text-white'
                            : 'text-blue-700'
                        }`}
                      />
                    </button>
                    <p className="text-blue-800 text-lg font-bold">
                      {callStatus === 'active'
                        ? 'Click to end the call'
                        : 'Give it a try!'}
                    </p>
                  </div>
                  <div className="pt-8">
                    <button
                      onClick={handleGetStarted}
                      className="px-8 py-3 text-lg font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <section
        id="features"
        className="w-full py-12 md:py-24 lg:py-32 bg-white"
      >
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-12 text-gray-900">
            Key Features
          </h2>
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Natural Language Processing
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Understand and respond to customer queries in natural language.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <Calendar className="h-12 w-12 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Reservation Management
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Effortlessly handle bookings and manage your restaurant's
                capacity.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <Clock className="h-12 w-12 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                24/7 Availability
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Provide round-the-clock assistance to your customers.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <BarChart className="h-12 w-12 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Caller Analytics
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Gain insights from call recordings, data analytics, and
                sentiment analysis.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <Menu className="h-12 w-12 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                Menu Embedding
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Easy access to real-time menus and updates for callers.
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <Cpu className="h-12 w-12 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">
                AI-Powered Assistance
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Leverage advanced AI to provide intelligent and context-aware
                responses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="w-full py-12 md:py-24 lg:py-32 bg-gray-50"
      >
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-12 text-gray-900">
            How FoodieBot Works
          </h2>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12"><div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                1. Onboarding
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Set up your restaurant's profile, including menu items,
                operating hours, and seating capacity.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                2. Customization
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Personalize your FoodieBot with a unique name, welcome message,
                and interaction style.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                3. Testing
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Thoroughly test your bot in a sandbox environment to ensure it
                meets your standards.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                4. Deployment
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Once satisfied, deploy FoodieBot to start handling customer
                calls and inquiries.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                5. Continuous Improvement
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Use analytics and insights to refine and improve your bot's
                performance over time.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                6. Scale with Ease
              </h3>
              <p className="text-gray-600 leading-relaxed">
                As your business grows, FoodieBot scales effortlessly to meet
                increasing demand.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="get-started"
        className="w-full py-12 md:py-24 lg:py-32 bg-white"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-gray-900">
              Ready to Transform Your Restaurant?
            </h2>
            <p className="max-w-[600px] text-gray-600 text-lg md:text-xl leading-relaxed">
              Join the restaurants already using FoodieBot to improve their
              customer service and streamline operations.
            </p>
            <button
              onClick={handleGetStarted}
              className="px-8 py-3 text-base font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-sm text-gray-500">
          © 2024 FoodieBot. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a
            className="text-sm hover:underline  underline-offset-4 text-gray-500"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="text-sm hover:underline underline-offset-4 text-gray-500"
            href="#"
          >
            Privacy Policy
          </a>
        </nav>
      </footer>
    </div>
  );
}