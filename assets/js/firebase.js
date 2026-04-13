// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

 const firebaseConfig = {
    apiKey: "AIzaSyAKLeXAysAEwyTl9-su44HZ7yWxAALkvaE",
    authDomain: "glory-ranking-json.firebaseapp.com",
    projectId: "glory-ranking-json",
    storageBucket: "glory-ranking-json.firebasestorage.app",
    messagingSenderId: "712676668102",
    appId: "1:712676668102:web:2cfcb1f976f29daf561dc7"
  };
  
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);