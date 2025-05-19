// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Import Firestore
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_98VubjoqRQHMRmg5SvbogKge-ReEu0c",
  authDomain: "game-app-7bc1c.firebaseapp.com",
  projectId: "game-app-7bc1c",
  storageBucket: "game-app-7bc1c.firebasestorage.app",
  messagingSenderId: "882783161126",
  appId: "1:882783161126:web:f060d2ee62de75bb704fe7",
  measurementId: "G-KSLKM24H4G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Initialize Firestore

export { app, analytics, db }; // Export app, analytics, and db