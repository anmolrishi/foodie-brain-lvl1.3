import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAYOyePTx647Beyyv4vxi_uufB1f8sx5GA",
  authDomain: "chella-aea4b.firebaseapp.com",
  projectId: "chella-aea4b",
  storageBucket: "chella-aea4b.appspot.com",
  messagingSenderId: "777798978964",
  appId: "1:777798978964:web:ec4f34e7d89d3eebd7d381",
  measurementId: "G-7E9N3ZWSLV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);