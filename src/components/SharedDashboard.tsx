import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { RetellWebClient } from "retell-client-js-sdk";
import { motion } from "framer-motion";
import { Podcast } from "lucide-react";
import { Mode } from './ModeSelector';

const webClient = new RetellWebClient();
const YOUR_API_KEY = "key_1d2025c27c6328b3f9840255e4df";
const CLOUD_FUNCTION_BASE_URL = "https://us-central1-chella-aea4b.cloudfunctions.net";

const saveCallAnalytics = async (userId: string, callId: string, mode: Mode) => {
  try {
    console.log(`Attempting to save analytics for call ID: ${callId}`);

    let analyticsData = null;
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 5000;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts += 1;

      const apiUrl = `https://api.retellai.com/v2/get-call/${callId}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${YOUR_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      analyticsData = await response.json();

      if (analyticsData && Object.keys(analyticsData).length > 0) {
        break;
      } else {
        analyticsData = null;
      }
    }

    if (!analyticsData) {
      console.error("Failed to get analytics data after maximum attempts");
      return;
    }

    const response = await fetch(
      `${CLOUD_FUNCTION_BASE_URL}/saveModeDashboardAnalyticsHttp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, callId, analyticsData, mode }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    console.log("Cloud Function result:", result);
  } catch (error) {
    console.error("Error saving call analytics:", error);
  }
};

export default function SharedDashboard() {
  const { userId, mode } = useParams<{ userId: string; mode: Mode }>();
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [agentData, setAgentData] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<"not-started" | "active" | "inactive">("not-started");
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentCallIdRef.current = currentCallId;
  }, [currentCallId]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId && mode) {
        try {
          const response = await fetch(
            `${CLOUD_FUNCTION_BASE_URL}/getModeUserDataHttp?userId=${userId}&mode=${mode}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setRestaurantName(data.restaurantName || "");
          setAgentData(data[`${mode}AgentData`] || null);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [userId, mode]);

  useEffect(() => {
    const handleConversationStarted = () => {
      setCallStatus("active");
    };

    const handleConversationEnded = ({ code, reason }: { code: any; reason: any }) => {
      setCallStatus("inactive");
      if (currentCallIdRef.current && userId && mode) {
        saveCallAnalytics(userId, currentCallIdRef.current, mode);
      }
    };

    const handleError = (error: any) => {
      console.error("An error occurred:", error);
      setCallStatus("inactive");
    };

    const handleUpdate = (update: any) => {
      if (update.type === "transcript" && update.transcript) {
        console.log(`${update.transcript.speaker}: ${update.transcript.text}`);
      }
    };

    webClient.on("conversationStarted", handleConversationStarted);
    webClient.on("conversationEnded", handleConversationEnded);
    webClient.on("error", handleError);
    webClient.on("update", handleUpdate);

    return () => {
      webClient.off("conversationStarted", handleConversationStarted);
      webClient.off("conversationEnded", handleConversationEnded);
      webClient.off("error", handleError);
      webClient.off("update", handleUpdate);
    };
  }, [userId, mode]);

  const toggleConversation = async () => {
    if (callStatus === "active") {
      try {
        await webClient.stopCall();
        setCallStatus("inactive");

        if (currentCallIdRef.current && userId && mode) {
          saveCallAnalytics(userId, currentCallIdRef.current, mode);
        }
      } catch (error) {
        console.error("Error stopping call:", error);
      }
    } else {
      if (!agentData) {
        console.error("Agent not created yet");
        return;
      }

      try {
        const response = await fetch(
          "https://api.retellai.com/v2/create-web-call",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${YOUR_API_KEY}`,
              "Content-Type": "application/json",
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
        setCurrentCallId(data.call_id);

        await webClient.startCall({
          accessToken: data.access_token,
          callId: data.call_id,
          sampleRate: 16000,
          enableUpdate: true,
        });
        setCallStatus("active");
      } catch (error) {
        console.error("Error starting call:", error);
      }
    }
  };

  if (!mode || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-xl font-semibold text-red-600">Invalid URL parameters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-blue-50">
      <div className="flex-grow p-8">
        <div className="text-center mb-8 pt-2">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            {restaurantName}'s {mode.charAt(0).toUpperCase() + mode.slice(1)} Assistant
          </h1>
          <p className="text-xl text-blue-700">Virtual Assistant</p>
        </div>
        <div className="flex justify-center items-center h-[calc(100vh-12rem)]">
          <div
            className="relative cursor-pointer z-10"
            onClick={toggleConversation}
          >
            <motion.div
              animate={{
                scale: callStatus === "active" ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 0.5,
                repeat: callStatus === "active" ? Infinity : 0,
                repeatType: "reverse",
              }}
            >
              <div
                className={`rounded-full p-16 ${
                  callStatus === "active" ? "bg-[#92d0ff]" : "bg-white"
                } shadow-lg ${
                  callStatus === "active"
                    ? "shadow-[#92d0ff]"
                    : "shadow-blue-200"
                }`}
              >
                <motion.div
                  animate={{
                    rotate: callStatus === "active" ? [0, 360] : 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: callStatus === "active" ? Infinity : 0,
                    ease: "linear",
                  }}
                >
                  <Podcast
                    size={110}
                    color={callStatus === "active" ? "white" : "#92d0ff"}
                  />
                </motion.div>
              </div>
            </motion.div>
            {callStatus === "active" && (
              <motion.div
                className="absolute -inset-3 rounded-full bg-[#92d0ff] opacity-50"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}