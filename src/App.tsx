import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Brain from './components/Brain';
import SharedDashboard from './components/SharedDashboard';
import PrivateRoute from './components/PrivateRoute';

const theme = extendTheme({
  fonts: {
    body: '"Kanit", sans-serif',
    heading: '"Kanit", sans-serif',
  },
  colors: {
    neonGreen: {
      50: '#E6FFF0',
      100: '#B3FFD1',
      200: '#80FFB3',
      300: '#4DFF94',
      400: '#1AFF75',
      500: '#00E664',
      600: '#00B34F',
      700: '#00803A',
      800: '#004D24',
      900: '#001A0F',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.100',
        color: 'black',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'md',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      },
      variants: {
        solid: {
          bg: 'black',
          color: 'white',
          _hover: {
            bg: 'neonGreen.500',
          },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _focus: {
              borderColor: 'neonGreen.500',
              boxShadow: '0 0 0 1px #00E664',
            },
            _hover: {
              borderColor: 'gray.400',
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          borderColor: 'gray.300',
          _focus: {
            borderColor: 'neonGreen.500',
            boxShadow: '0 0 0 1px #00E664',
          },
          _hover: {
            borderColor: 'gray.400',
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            _focus: {
              borderColor: 'neonGreen.500',
              boxShadow: '0 0 0 1px #00E664',
            },
            _hover: {
              borderColor: 'gray.400',
            },
          },
        },
      },
    },
  },
});

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />
          <Route
            path="/brain"
            element={
              <PrivateRoute>
                <Brain />
              </PrivateRoute>
            }
          />
          <Route path="/shared/:userId/:mode" element={<SharedDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}