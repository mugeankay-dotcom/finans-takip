// Firebase Configuration
// Bu bilgileri Firebase Konsolundan aldınız.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIbSp34lHzohKMa5s5H1hOQvO-y4SDI7A",
  authDomain: "finanstakip1-e29cb.firebaseapp.com",
  projectId: "finanstakip1-e29cb",
  storageBucket: "finanstakip1-e29cb.firebasestorage.app",
  messagingSenderId: "653666081026",
  appId: "1:653666081026:web:7274a3872dab1bc6da8a1b",
  measurementId: "G-JBC1QMW0Q3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

// Initialize Firebase
// Note: We use 'firebase' global from CDN scripts in index.html
if (typeof firebase !== 'undefined') {
  const app = firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore(); // Use var to ensure global scope visibility if needed
  console.log('Firebase Config loaded. ☁️');
} else {
  console.error('Firebase SDK not found. Check index.html');
}
