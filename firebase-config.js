// Firebase Configuration
// Bu bilgileri Firebase Konsolundan aldınız.

const firebaseConfig = {
  apiKey: "AIzaSyAXfHWpe7Pd1yj8lCt8mRw7RBv0x1e6r4E",
  authDomain: "finanstakip-f2dca.firebaseapp.com",
  projectId: "finanstakip-f2dca",
  storageBucket: "finanstakip-f2dca.firebasestorage.app",
  messagingSenderId: "431970136870",
  appId: "1:431970136870:web:e8eff811609197ff2d87e7",
  measurementId: "G-ZWXEXXW5YT"
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
