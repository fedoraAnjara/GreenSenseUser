import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { generateWeeklyMenu } from "./gemini";

const getCurrentWeek = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
};

export const getCurrentDay = () => {
  const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  return jours[new Date().getDay()];
};

export const getOrGenerateMenu = async (userId, healthProfile) => {
  const semaine = getCurrentWeek();
  const menuRef = doc(db, "users", userId, "menus", semaine);

  try {
    // Vérifier si un menu existe déjà
    const menuSnap = await getDoc(menuRef);

    if (menuSnap.exists()) {
      const data = menuSnap.data();
      console.log("Menu chargé depuis Firestore:", data);

      // S'assurer que semaine est bien un tableau
      if (Array.isArray(data.semaine)) {
        return data;
      }
      // Si ce n'est pas un tableau, régénérer
      console.log("Format invalide, régénération...");
    }

    // Générer un nouveau menu
    console.log("Génération d'un nouveau menu...");
    const menuData = await generateWeeklyMenu(healthProfile);
    console.log("Menu généré:", menuData);

    // Vérifier que la structure est correcte
    if (!menuData?.semaine || !Array.isArray(menuData.semaine)) {
      throw new Error("Format de menu invalide retourné par Gemini");
    }

    // Sauvegarder dans Firestore — séparément pour éviter les conflits
    await setDoc(menuRef, {
      semaine: menuData.semaine,
      semaineCode: semaine,
      generatedAt: serverTimestamp(),
    });

    return { semaine: menuData.semaine };

  } catch (e) {
    console.error("Erreur menuService:", e);
    throw e;
  }
};