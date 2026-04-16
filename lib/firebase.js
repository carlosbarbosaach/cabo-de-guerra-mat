import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database"; // Precisamos disso para o Realtime!

const firebaseConfig = {
  apiKey: "AIzaSyDklB3CuaIqDybp9x27r38x-73bLKx0HDs",
  authDomain: "cabo-de-guerra-matematica.firebaseapp.com",
  databaseURL: "https://cabo-de-guerra-matematica-default-rtdb.firebaseio.com", // Adicionei esta linha!
  projectId: "cabo-de-guerra-matematica",
  storageBucket: "cabo-de-guerra-matematica.firebasestorage.app",
  messagingSenderId: "541181761709",
  appId: "1:541181761709:web:d435ee08feaf1fcab78e24"
};

// Inicializa o Firebase apenas se não houver um app rodando
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// O EXPORT QUE ESTAVA FALTANDO:
export const db = getDatabase(app);