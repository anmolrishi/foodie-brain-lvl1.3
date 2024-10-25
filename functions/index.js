const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Original functions
exports.saveSharedDashboardAnalyticsHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { userId, callId, analyticsData } = req.body;

  if (!userId || !callId || !analyticsData) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await userRef.update({
      [`analytics.${callId}`]: analyticsData
    });

    res.status(200).json({ success: true, message: 'Analytics saved successfully' });
  } catch (error) {
    console.error('Error saving shared dashboard analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

exports.getUserDataHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const userId = req.query.userId;

  if (!userId) {
    res.status(400).json({ error: 'Missing userId parameter' });
    return;
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    // Only send necessary data to the client
    const responseData = {
      restaurantName: userData.restaurantName || '',
      agentData: userData.agentData || null,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// New functions for mode-specific operations
exports.saveModeDashboardAnalyticsHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { userId, callId, analyticsData, mode } = req.body;

  if (!userId || !callId || !analyticsData || !mode) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // Validate mode
  const validModes = ['customer', 'operations', 'sales'];
  if (!validModes.includes(mode)) {
    res.status(400).json({ error: 'Invalid mode parameter' });
    return;
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await userRef.update({
      [`analytics.${mode}.${callId}`]: analyticsData
    });

    res.status(200).json({ success: true, message: 'Analytics saved successfully' });
  } catch (error) {
    console.error('Error saving mode dashboard analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

exports.getModeUserDataHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const userId = req.query.userId;
  const mode = req.query.mode;

  if (!userId || !mode) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // Validate mode
  const validModes = ['customer', 'operations', 'sales'];
  if (!validModes.includes(mode)) {
    res.status(400).json({ error: 'Invalid mode parameter' });
    return;
  }

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    
    // Return mode-specific data along with common restaurant data
    const responseData = {
      restaurantName: userData.restaurantName || '',
      [`${mode}AgentData`]: userData[`${mode}AgentData`] || null,
      [`${mode}LlmData`]: userData[`${mode}LlmData`] || null,
      // Common restaurant data
      seatingCapacity: userData.seatingCapacity || '',
      address: userData.address || '',
      menu: userData.menu || '',
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching mode user data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});