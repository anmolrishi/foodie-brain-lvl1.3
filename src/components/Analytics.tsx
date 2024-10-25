import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Navbar from './Navbar';
import CallerConfigurationModal from './CallerConfigurationModal';
import EditRestaurantInfo from './EditRestaurantInfo';
import { Mode } from './ModeSelector';
import {
  Box,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  VStack,
  HStack,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  IconButton,
  useToast
} from '@chakra-ui/react';
import {
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DownloadIcon, Share2 } from 'lucide-react';
import { FaPhoneAlt, FaClock, FaSmile, FaFrown } from 'react-icons/fa';
import ReactAudioPlayer from 'react-audio-player';

interface CallAnalytics {
  [mode: string]: {
    [callId: string]: {
      agent_id: string;
      call_status: string;
      start_timestamp: number;
      end_timestamp: number;
      duration_ms: number;
      transcript: string;
      transcript_object: Array<{
        role: string;
        content: string;
        words: Array<{ word: string; start: number; end: number }>;
      }>;
      recording_url: string;
      disconnection_reason: string;
      llm_latency: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
        max: number;
        min: number;
        num: number;
      };
      e2e_latency: {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
        max: number;
        min: number;
        num: number;
      };
      cost_metadata: {
        telecommunication: string;
        llm_model: string;
        voice_provider: string;
      };
      call_cost: {
        total_duration_unit_price: number;
        product_costs: Array<{
          unit_price: number;
          product: string;
          cost: number;
        }>;
        total_one_time_price: number;
        combined_cost: number;
        total_duration_seconds: number;
      };
      call_analysis: {
        agent_task_completion_rating: string;
        call_successful: boolean;
        in_voicemail: boolean;
        call_summary: string;
        user_sentiment: string;
        call_completion_rating: string;
      };
    };
  };
}

interface AnalyticsProps {
  userId?: string;
}

export default function Analytics({ userId }: AnalyticsProps) {
  const [selectedMode, setSelectedMode] = useState<Mode>('customer');
  const [analytics, setAnalytics] = useState<CallAnalytics>({});
  const [showCallerConfig, setShowCallerConfig] = useState(false);
  const [showEditRestaurantInfo, setShowEditRestaurantInfo] = useState(false);
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [beginMessage, setBeginMessage] = useState('');
  const [model, setModel] = useState('');
  const [botName, setBotName] = useState('');
  const [tone, setTone] = useState('');
  const [callTransferNumber, setCallTransferNumber] = useState('');
  const [llmData, setLLMData] = useState(null);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const user = userId ? { uid: userId } : auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAnalytics(data.analytics || {});
          setRestaurantName(data.restaurantName || '');
          setBeginMessage(data[`${selectedMode}BeginMessage`] || '');
          setModel(data[`${selectedMode}Model`] || '');
          setBotName(data[`${selectedMode}BotName`] || '');
          setTone(data[`${selectedMode}Tone`] || '');
          setCallTransferNumber(data.callTransferNumber || '');
          setLLMData(data[`${selectedMode}LlmData`] || null);
        }
      }
    };
    fetchData();
  }, [userId, selectedMode]);

  const currentModeAnalytics = analytics[selectedMode] || {};
  const totalCalls = Object.keys(currentModeAnalytics).length;
  const totalDuration = Object.values(currentModeAnalytics).reduce(
    (sum, call) => sum + call.duration_ms,
    0
  );
  const averageDuration = totalCalls > 0 ? totalDuration / totalCalls / 1000 : 0;

  const callDurationData = Object.entries(currentModeAnalytics).map(([callId, data]) => ({
    name: callId.slice(0, 8),
    duration: parseFloat((data.duration_ms / 1000).toFixed(2)),
  }));

  const sentimentData = Object.values(currentModeAnalytics).reduce((acc, call) => {
    const sentiment = call.call_analysis.user_sentiment || 'Unknown';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const negativeSentimentCount = sentimentData['Negative'] || 0;
  const negativeSentimentRatio = totalCalls > 0 ? negativeSentimentCount / totalCalls : 0;

  const sentimentChartData = Object.entries(sentimentData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6384', '#36A2EB'];

  const handleRestaurantNameUpdate = (newName: string) => {
    setRestaurantName(newName);
  };

  const handleRowClick = (callId: string) => {
    setSelectedCall({ callId, data: currentModeAnalytics[callId] });
    onOpen();
  };

  const handleShare = () => {
    const user = auth.currentUser;
    if (user) {
      const sharedUrl = `${window.location.origin}/shared/${user.uid}/${selectedMode}`;
      navigator.clipboard.writeText(sharedUrl);
      toast({
        title: "Share link copied!",
        description: "The link has been copied to your clipboard.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {!userId && (
        <Navbar
          onOpenCallerConfig={() => setShowCallerConfig(true)}
          onOpenEditRestaurantInfo={() => setShowEditRestaurantInfo(true)}
          isExpanded={isNavbarExpanded}
          setIsExpanded={setIsNavbarExpanded}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
        />
      )}
      <div className={`flex-grow p-8 transition-all duration-300 ${isNavbarExpanded && !userId ? 'ml-64' : 'ml-20'}`}>
        <VStack spacing={8} align="stretch">
          <div className="flex items-center justify-between mb-8">
            <Heading as="h1" size="xl" color="blue.800">
              {restaurantName}'s Analytics
            </Heading>
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold capitalize">
                {selectedMode} Mode
              </span>
              <Button
                leftIcon={<Share2 />}
                colorScheme="blue"
                variant="outline"
                onClick={handleShare}
              >
                Share Dashboard
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <HStack spacing={6}>
            <Box flex="1" bg="white" p={6} borderRadius="md" boxShadow="lg" textAlign="center">
              <FaPhoneAlt size={40} color="#3182CE" />
              <Stat mt={2}>
                <StatLabel fontSize="lg" mt={2}>Total Calls</StatLabel>
                <StatNumber fontSize="3xl">{totalCalls}</StatNumber>
              </Stat>
            </Box>
            <Box flex="1" bg="white" p={6} borderRadius="md" boxShadow="lg" textAlign="center">
              <FaClock size={40} color="#D69E2E" />
              <Stat mt={2}>
                <StatLabel fontSize="lg" mt={2}>Average Duration</StatLabel>
                <StatNumber fontSize="3xl">{averageDuration.toFixed(2)}s</StatNumber>
              </Stat>
            </Box>
            <Box flex="1" bg="white" p={6} borderRadius="md" boxShadow="lg" textAlign="center">
              {negativeSentimentRatio <= 0.5 ? (
                <FaSmile size={40} color="#38A169" />
              ) : (
                <FaFrown size={40} color="#E53E3E" />
              )}
              <Stat mt={2}>
                <StatLabel fontSize="lg" mt={2}>Negative Sentiment Ratio</StatLabel>
                <StatNumber fontSize="3xl">
                  {(negativeSentimentRatio * 100).toFixed(2)}%
                </StatNumber>
              </Stat>
            </Box>
          </HStack>

          {/* Charts */}
          <HStack spacing={8} align="start">
            {/* Line Chart for Call Duration */}
            <Box width="100%" bg="white" p={6} borderRadius="md" boxShadow="lg" height="400px">
              <Heading as="h2" size="md" mb={4} color="blue.700">
                Call Duration Over Time
              </Heading>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={callDurationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="#3182CE"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Pie Chart for Sentiment Distribution */}
            <Box width="100%" bg="white" p={6} borderRadius="md" boxShadow="lg" height="400px">
              <Heading as="h2" size="md" mb={4} color="blue.700">
                User Sentiment Distribution
              </Heading>
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={sentimentChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {sentimentChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </HStack>

          {/* Detailed Call Analytics Table */}
          <Box bg="white" p={6} borderRadius="md" boxShadow="lg">
            <Heading as="h2" size="lg" mb={4} color="blue.700">
              Call Details
            </Heading>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Call ID</Th>
                    <Th>Duration</Th>
                    <Th>User Sentiment</Th>
                    <Th>LLM Model</Th>
                    <Th>Recording</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(currentModeAnalytics).map(([callId, data]) => (
                    <Tr
                      key={callId}
                      onClick={() => handleRowClick(callId)}
                      _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                    >
                      <Td>{callId.slice(0, 8)}</Td>
                      <Td>{(data.duration_ms / 1000).toFixed(2)}s</Td>
                      <Td>{data.call_analysis.user_sentiment || 'Unknown'}</Td>
                      <Td>{data.cost_metadata.llm_model || 'N/A'}</Td>
                      <Td>
                        {data.recording_url ? (
                          <ReactAudioPlayer
                            src={data.recording_url}
                            controls
                            style={{ width: '200px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          'N/A'
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        </VStack>
      </div>

      {/* Modal for Call Details */}
      {selectedCall && (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              Call Details - {selectedCall.callId.slice(0, 8)}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack align="start" spacing={4}>
                <Text>
                  <strong>Call Duration:</strong>{' '}
                  {(selectedCall.data.duration_ms / 1000).toFixed(2)}s
                </Text>
                <Text>
                  <strong>User Sentiment:</strong>{' '}
                  {selectedCall.data.call_analysis.user_sentiment || 'Unknown'}
                </Text>
                <Text>
                  <strong>LLM Model:</strong>{' '}
                  {selectedCall.data.cost_metadata.llm_model || 'N/A'}
                </Text>
                <Text>
                  <strong>Call Summary:</strong>{' '}
                  {selectedCall.data.call_analysis.call_summary || 'N/A'}
                </Text>
                <Text>
                  <strong>Transcript:</strong>
                </Text>
                <Box
                  maxHeight="200px"
                  overflowY="auto"
                  width="100%"
                  bg="gray.100"
                  p={4}
                  borderRadius="md"
                >
                  <Text whiteSpace="pre-wrap">
                    {selectedCall.data.transcript || 'N/A'}
                  </Text>
                </Box>
                {/* Additional Details */}
                <Divider />
                <Text>
                  <strong>Agent Task Completion Rating:</strong>{' '}
                  {selectedCall.data.call_analysis.agent_task_completion_rating ||
                    'N/A'}
                </Text>
                <Text>
                  <strong>Call Successful:</strong>{' '}
                  {selectedCall.data.call_analysis.call_successful ? 'Yes' : 'No'}
                </Text>
                <Text>
                  <strong>In Voicemail:</strong>{' '}
                  {selectedCall.data.call_analysis.in_voicemail ? 'Yes' : 'No'}
                </Text>
                <Text>
                  <strong>Disconnection Reason:</strong>{' '}
                  {selectedCall.data.disconnection_reason || 'N/A'}
                </Text>
                <Text>
                  <strong>Voice Provider:</strong>{' '}
                  {selectedCall.data.cost_metadata.voice_provider || 'N/A'}
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter>
              {selectedCall.data.recording_url && (
                <HStack spacing={4} mr="auto">
                  <ReactAudioPlayer
                    src={selectedCall.data.recording_url}
                    controls
                    style={{ width: '300px' }}
                  />
                  <IconButton
                    icon={<DownloadIcon />}
                    aria-label="Download Recording"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedCall.data.recording_url;
                      link.download = `Recording-${selectedCall.callId}.mp3`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  />
                </HStack>
              )}
              <Button colorScheme="blue" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {!userId && showCallerConfig && (
        <CallerConfigurationModal
          isOpen={showCallerConfig}
          onClose={() => setShowCallerConfig(false)}
          beginMessage={beginMessage}
          model={model}
          botName={botName}
          tone={tone}
          callTransferNumber={callTransferNumber}
          llmData={llmData}
          setBeginMessage={setBeginMessage}
          setModel={setModel}
          setBotName={setBotName}
          setTone={setTone}
          setCallTransferNumber={setCallTransferNumber}
          setLLMData={setLLMData}
          mode={selectedMode}
        />
      )}
      {!userId && showEditRestaurantInfo && (
        <EditRestaurantInfo
          onClose={() => setShowEditRestaurantInfo(false)}
          onUpdateRestaurantName={handleRestaurantNameUpdate}
        />
      )}
    </div>
  );
}