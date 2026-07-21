import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db, auth } from "../../src/lib/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function ProfileScreen() {
  const { user, userData, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const router = useRouter();

  const [healthProfile, setHealthProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchHealthProfile = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(
          doc(db, "users", user.uid, "profilSante", "data")
        );
        if (snap.exists()) setHealthProfile(snap.data());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthProfile();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(t.profile.logout, t.profile.logoutConfirm, [
      { text: t.common.no, style: "cancel" },
      { text: t.common.yes, onPress: logout, style: "destructive" },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est définitive. Toutes vos données (profil, santé, conversations) seront effacées et ne pourront pas être récupérées. Voulez-vous continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // 1. Supprimer les conversations (sous-collection)
      const convSnap = await getDocs(
        collection(db, "users", user.uid, "conversations")
      );
      await Promise.all(convSnap.docs.map((d) => deleteDoc(d.ref)));

      // 2. Supprimer le profil santé
      await deleteDoc(
        doc(db, "users", user.uid, "profilSante", "data")
      ).catch(() => {});

      // 3. Supprimer le document utilisateur
      await deleteDoc(doc(db, "users", user.uid));

      // 4. Supprimer le compte Auth
      await deleteUser(auth.currentUser);

      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Erreur suppression:", e);
      setDeleting(false);
      if (e.code === "auth/requires-recent-login") {
        Alert.alert(
          "Reconnexion requise",
          "Pour des raisons de sécurité, veuillez vous déconnecter et vous reconnecter, puis réessayer de supprimer votre compte.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Erreur", "La suppression a échoué. Réessayez plus tard.");
      }
    }
  };

  const formatList = (arr) => {
    if (!arr || arr.length === 0) return t.profile.none;
    return arr.join(", ");
  };

  // Contenu légal/info bilingue et enrichi
  const LEGAL_CONTENT = {
    fr: {
      mentions: {
        title: "Mentions légales",
        body: `Dernière mise à jour : janvier 2026

ÉDITEUR DE L'APPLICATION
GreenSense est une application mobile développée dans le cadre d'un projet de fin d'études universitaire à Madagascar. Elle vise à promouvoir une alimentation saine et locale en reliant les consommateurs aux producteurs agricoles.

DIRECTEUR DE LA PUBLICATION
L'équipe GreenSense, représentée par le porteur du projet.

OBJET DU SERVICE
GreenSense est une plateforme de recommandations nutritionnelles personnalisées qui met en relation les consommateurs avec les producteurs agricoles locaux, notamment grâce à un système de publication par SMS destiné aux agriculteurs sans accès à internet.

HÉBERGEMENT DES DONNÉES
Les données de l'application sont hébergées par Google Firebase, service fourni par Google LLC (1600 Amphitheatre Parkway, Mountain View, Californie, États-Unis). Le traitement par intelligence artificielle est assuré via l'API Google Gemini.

PROPRIÉTÉ INTELLECTUELLE
L'ensemble des éléments de l'application (structure, textes, design, logo, code source) est protégé et demeure la propriété de GreenSense, sauf mention contraire. Toute reproduction non autorisée est interdite.

CRÉDITS
Cartographie fournie par OpenStreetMap et ses contributeurs. Icônes et illustrations sous licences libres.

CONTACT
Pour toute question relative aux présentes mentions : contact@greensense.mg`,
      },
      conditions: {
        title: "Conditions d'utilisation",
        body: `Dernière mise à jour : janvier 2026

En téléchargeant et en utilisant GreenSense, vous acceptez sans réserve les présentes conditions générales d'utilisation. Si vous n'y adhérez pas, nous vous invitons à ne pas utiliser l'application.

1. ACCÈS AU SERVICE
GreenSense est accessible gratuitement à toute personne disposant d'un appareil compatible et d'une connexion internet. Certaines fonctionnalités, comme la géolocalisation des producteurs, nécessitent l'activation d'autorisations spécifiques.

2. NATURE DU SERVICE
GreenSense fournit des informations et recommandations nutritionnelles à titre purement informatif et éducatif. Ces contenus, y compris ceux générés par l'assistant intelligent Vita, ne constituent en aucun cas un avis médical et ne remplacent pas la consultation d'un professionnel de santé qualifié.

3. COMPTE UTILISATEUR
La création d'un compte requiert une adresse email valide. Vous êtes seul responsable de la confidentialité de vos identifiants ainsi que de toute activité réalisée depuis votre compte. Vous vous engagez à fournir des informations exactes.

4. UTILISATION RESPONSABLE
Vous vous engagez à utiliser l'application de manière loyale, à ne pas tenter d'en compromettre la sécurité, et à ne publier aucun contenu illicite, trompeur ou inapproprié.

5. CONTENU DES PRODUCTEURS
Les annonces des producteurs, transmises notamment par SMS, sont publiées après validation par un administrateur. GreenSense ne saurait toutefois garantir l'exactitude permanente des prix, quantités ou disponibilités annoncés.

6. RESPONSABILITÉ
GreenSense est fournie « en l'état ». Nous ne saurions être tenus responsables des décisions alimentaires prises sur la base des recommandations, ni des transactions conclues directement entre consommateurs et producteurs.

7. SUSPENSION ET RÉSILIATION
Nous nous réservons le droit de suspendre tout compte ne respectant pas les présentes conditions.

8. MODIFICATION DES CONDITIONS
Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés des changements substantiels.`,
      },
      confidentialite: {
        title: "Politique de confidentialité",
        body: `Dernière mise à jour : janvier 2026

Votre vie privée est essentielle pour nous. Cette politique explique quelles données nous collectons, pourquoi, et comment elles sont protégées.

1. DONNÉES QUE NOUS COLLECTONS
Données de compte : nom et adresse email.
Profil de santé : poids, taille, IMC, pathologies, objectifs nutritionnels et allergies que vous renseignez volontairement.
Données de localisation : votre position approximative, uniquement lorsque vous utilisez la carte ou le fil des producteurs proches.
Données d'usage : vos échanges avec l'assistant Vita, afin d'améliorer la pertinence des réponses.

2. POURQUOI NOUS UTILISONS CES DONNÉES
Pour personnaliser vos recommandations nutritionnelles, vous proposer les producteurs les plus proches, et améliorer continuellement le service. Nous ne vendons jamais vos données.

3. VOS DONNÉES DE SANTÉ
Vos informations de santé sont particulièrement sensibles. Elles servent exclusivement à adapter vos recommandations et ne sont jamais partagées à des fins commerciales ou publicitaires.

4. LOCALISATION
Votre position est utilisée en temps réel pour calculer les distances avec les points de vente. Elle n'est pas conservée de manière permanente dans nos serveurs.

5. PARTAGE DES DONNÉES
Vos données ne sont accessibles qu'à vous-même et, de façon limitée, à l'administrateur de la plateforme. Elles sont traitées via Google Firebase, soumis à ses propres garanties de sécurité.

6. SÉCURITÉ
Nous appliquons des règles de sécurité strictes au niveau de la base de données afin que chaque utilisateur ne puisse accéder qu'à ses propres informations.

7. VOS DROITS
Vous pouvez à tout moment consulter, modifier ou supprimer vos données directement depuis votre profil, ou en nous contactant.

8. CONTACT
Pour toute question relative à vos données : privacy@greensense.mg`,
      },
      about: {
        title: "À propos",
        body: `GreenSense
Version 1.0.0

NOTRE HISTOIRE
GreenSense est née d'un constat simple : à Madagascar, bien manger ne devrait pas être un luxe, et les producteurs locaux méritent d'être valorisés. L'application connecte ces deux mondes.

NOTRE MISSION
Favoriser une alimentation saine, locale et accessible, tout en soutenant les agriculteurs malgaches grâce à des technologies inclusives. Notre innovation phare : un système de publication par SMS qui permet aux producteurs sans accès à internet de partager leurs récoltes.

CE QUE GREENSENSE VOUS OFFRE
Vita, votre assistant nutritionnel personnel qui vous conseille selon votre profil de santé.
Des menus personnalisés mettant à l'honneur les produits locaux.
Une carte interactive des producteurs et points de vente près de chez vous.
Un fil d'actualités des produits frais disponibles, directement des champs.

NOTRE VISION
Un Madagascar où chaque consommateur mange mieux et où chaque agriculteur trouve sa place dans l'économie numérique.

Développé avec passion à Madagascar. 🇲🇬`,
      },
      help: {
        title: "Aide & Support",
        body: `Bienvenue dans le centre d'aide GreenSense. Voici les réponses aux questions les plus fréquentes.

COMMENT COMPLÉTER MON PROFIL DE SANTÉ ?
Rendez-vous dans votre profil, section « Informations de santé », puis appuyez sur « Modifier ». Renseignez votre poids, votre taille et, si vous le souhaitez, vos pathologies, objectifs et allergies. Plus votre profil est complet, plus les recommandations sont précises.

COMMENT FONCTIONNE L'ASSISTANT VITA ?
Vita est votre assistant nutritionnel intelligent. Il connaît votre profil de santé et les producteurs proches de vous. Posez-lui vos questions sur l'alimentation, demandez-lui un menu ou des idées de repas adaptés à vos besoins.

COMMENT TROUVER LES PRODUCTEURS PRÈS DE MOI ?
La carte interactive et le carrousel « Près de vous » sur l'accueil affichent les producteurs et points de vente les plus proches, avec leurs produits disponibles. Activez la localisation pour de meilleurs résultats.

POURQUOI CERTAINS PRODUITS ARRIVENT PAR SMS ?
De nombreux agriculteurs n'ont pas accès à internet. GreenSense leur permet de publier leurs récoltes par simple SMS. Ces annonces sont vérifiées avant d'apparaître dans votre fil.

LES RECOMMANDATIONS REMPLACENT-ELLES UN MÉDECIN ?
Non, jamais. Les conseils de Vita sont éducatifs et informatifs. Pour tout problème de santé, consultez impérativement un professionnel qualifié.

COMMENT CHANGER LA LANGUE ?
Dans votre profil, section « Préférences », appuyez sur « Langue » pour basculer entre le français et l'anglais.

BESOIN D'AIDE SUPPLÉMENTAIRE ?
Notre équipe est là pour vous : support@greensense.mg`,
      },
    },
    en: {
      mentions: {
        title: "Legal Notice",
        body: `Last updated: January 2026

APP PUBLISHER
GreenSense is a mobile application developed as part of a university final-year project in Madagascar. It aims to promote healthy, local eating by connecting consumers with agricultural producers.

PUBLICATION DIRECTOR
The GreenSense team, represented by the project lead.

PURPOSE OF THE SERVICE
GreenSense is a personalized nutrition recommendation platform connecting consumers with local farmers, notably through an SMS-based publishing system for farmers without internet access.

DATA HOSTING
The application's data is hosted by Google Firebase, a service provided by Google LLC (1600 Amphitheatre Parkway, Mountain View, California, USA). Artificial intelligence processing is handled through the Google Gemini API.

INTELLECTUAL PROPERTY
All elements of the application (structure, text, design, logo, source code) are protected and remain the property of GreenSense, unless otherwise stated. Any unauthorized reproduction is prohibited.

CREDITS
Mapping provided by OpenStreetMap and its contributors. Icons and illustrations under open licenses.

CONTACT
For any question regarding this legal notice: contact@greensense.mg`,
      },
      conditions: {
        title: "Terms of Use",
        body: `Last updated: January 2026

By downloading and using GreenSense, you fully accept these terms of use. If you do not agree, please refrain from using the application.

1. ACCESS TO THE SERVICE
GreenSense is freely available to anyone with a compatible device and an internet connection. Some features, such as producer geolocation, require enabling specific permissions.

2. NATURE OF THE SERVICE
GreenSense provides nutritional information and recommendations for purely informational and educational purposes. This content, including that generated by the intelligent assistant Vita, does not constitute medical advice and does not replace consultation with a qualified health professional.

3. USER ACCOUNT
Creating an account requires a valid email address. You are solely responsible for keeping your credentials confidential and for all activity carried out from your account. You agree to provide accurate information.

4. RESPONSIBLE USE
You agree to use the application fairly, not to attempt to compromise its security, and not to publish any illegal, misleading, or inappropriate content.

5. PRODUCER CONTENT
Producer listings, notably those sent by SMS, are published after validation by an administrator. GreenSense cannot, however, guarantee the permanent accuracy of advertised prices, quantities, or availability.

6. LIABILITY
GreenSense is provided "as is." We cannot be held liable for dietary decisions made based on the recommendations, nor for transactions concluded directly between consumers and producers.

7. SUSPENSION AND TERMINATION
We reserve the right to suspend any account that does not comply with these terms.

8. CHANGES TO THE TERMS
These terms may be modified at any time. Users will be informed of any substantial changes.`,
      },
      confidentialite: {
        title: "Privacy Policy",
        body: `Last updated: January 2026

Your privacy is essential to us. This policy explains what data we collect, why, and how it is protected.

1. DATA WE COLLECT
Account data: name and email address.
Health profile: weight, height, BMI, conditions, nutritional goals, and allergies that you voluntarily provide.
Location data: your approximate position, only when you use the map or the nearby producers feed.
Usage data: your conversations with the Vita assistant, to improve the relevance of responses.

2. WHY WE USE THIS DATA
To personalize your nutritional recommendations, suggest the closest producers, and continuously improve the service. We never sell your data.

3. YOUR HEALTH DATA
Your health information is particularly sensitive. It is used exclusively to tailor your recommendations and is never shared for commercial or advertising purposes.

4. LOCATION
Your position is used in real time to calculate distances to points of sale. It is not permanently stored on our servers.

5. DATA SHARING
Your data is accessible only to you and, in a limited way, to the platform administrator. It is processed via Google Firebase, subject to its own security guarantees.

6. SECURITY
We apply strict security rules at the database level so that each user can only access their own information.

7. YOUR RIGHTS
You can view, modify, or delete your data at any time directly from your profile, or by contacting us.

8. CONTACT
For any question regarding your data: privacy@greensense.mg`,
      },
      about: {
        title: "About",
        body: `GreenSense
Version 1.0.0

OUR STORY
GreenSense was born from a simple observation: in Madagascar, eating well should not be a luxury, and local producers deserve to be valued. The app connects these two worlds.

OUR MISSION
To promote healthy, local, and accessible eating while supporting Malagasy farmers through inclusive technology. Our flagship innovation: an SMS-based publishing system that allows producers without internet access to share their harvests.

WHAT GREENSENSE OFFERS
Vita, your personal nutrition assistant that advises you based on your health profile.
Personalized menus showcasing local products.
An interactive map of producers and points of sale near you.
A news feed of fresh products available, straight from the fields.

OUR VISION
A Madagascar where every consumer eats better and every farmer finds their place in the digital economy.

Made with passion in Madagascar. 🇲🇬`,
      },
      help: {
        title: "Help & Support",
        body: `Welcome to the GreenSense help center. Here are answers to the most frequently asked questions.

HOW DO I COMPLETE MY HEALTH PROFILE?
Go to your profile, "Health information" section, then tap "Edit." Enter your weight, height and, if you wish, your conditions, goals, and allergies. The more complete your profile, the more accurate the recommendations.

HOW DOES THE VITA ASSISTANT WORK?
Vita is your intelligent nutrition assistant. It knows your health profile and the producers near you. Ask it questions about food, request a menu, or get meal ideas tailored to your needs.

HOW DO I FIND PRODUCERS NEAR ME?
The interactive map and the "Near you" carousel on the home screen show the closest producers and points of sale, with their available products. Enable location for better results.

WHY DO SOME PRODUCTS ARRIVE BY SMS?
Many farmers do not have internet access. GreenSense lets them publish their harvests via a simple SMS. These listings are verified before appearing in your feed.

DO RECOMMENDATIONS REPLACE A DOCTOR?
No, never. Vita's advice is educational and informational. For any health concern, you must consult a qualified professional.

HOW DO I CHANGE THE LANGUAGE?
In your profile, "Preferences" section, tap "Language" to switch between French and English.

NEED MORE HELP?
Our team is here for you: support@greensense.mg`,
      },
    },
  };

  const modalContent = LEGAL_CONTENT[language] || LEGAL_CONTENT.fr;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    rightElement,
    isLast,
  }) => (
    <>
      <TouchableOpacity
        style={styles.settingRow}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.6 : 1}
      >
        <View style={styles.settingLeft}>
          <Text style={styles.settingIcon}>{icon}</Text>
          <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <View style={styles.settingRight}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          {rightElement}
          {onPress && !rightElement && (
            <Text style={styles.settingArrow}>›</Text>
          )}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Header blanc épuré */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar avec anneau vert */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userData?.nom?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{userData?.nom}</Text>
          <Text style={styles.userEmail}>{userData?.email}</Text>
        </View>

        {/* Profil de santé */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.profile.healthInfo}</Text>
            <TouchableOpacity
              onPress={() =>
                router.push("/(consumer)/health-profile?mode=edit")
              }
            >
              <Text style={styles.editLink}>{t.profile.editHealth}</Text>
            </TouchableOpacity>
          </View>

          {!healthProfile ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏥</Text>
              <Text style={styles.emptyText}>{t.profile.noHealthData}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() =>
                  router.push("/(consumer)/health-profile?mode=edit")
                }
              >
                <Text style={styles.emptyBtnText}>{t.profile.completeNow}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{healthProfile.poids}</Text>
                  <Text style={styles.metricUnit}>{t.profile.kg}</Text>
                  <Text style={styles.metricLabel}>{t.profile.weight}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{healthProfile.taille}</Text>
                  <Text style={styles.metricUnit}>{t.profile.cm}</Text>
                  <Text style={styles.metricLabel}>{t.profile.height}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{healthProfile.imc}</Text>
                  <Text style={styles.metricUnit}> </Text>
                  <Text style={styles.metricLabel}>{t.profile.imc}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.profile.pathologies}</Text>
                <Text style={styles.infoValue}>
                  {formatList(healthProfile.pathologies)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.profile.objectives}</Text>
                <Text style={styles.infoValue}>
                  {formatList(healthProfile.objectifs)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t.profile.allergies}</Text>
                <Text style={styles.infoValue}>
                  {formatList(healthProfile.allergies)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Préférences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.card}>
            <SettingRow
              icon={<Ionicons name="language" size={23} color="black" />}
              label={t.profile.language}
              value={language === "fr" ? "Français" : "English"}
              onPress={toggleLanguage}
            />
            <SettingRow
              icon="🔔"
              label="Notifications"
              value={t.profile.soon}
              isLast
            />
          </View>
        </View>

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.card}>
            <SettingRow
              icon={
                <MaterialIcons
                  name="perm-device-information"
                  size={24}
                  color="black"
                />
              }
              label={t.profile.about}
              onPress={() => setActiveModal("about")}
            />
            <SettingRow
              icon={<MaterialIcons name="help" size={24} color="black" />}
              label={t.profile.help}
              onPress={() => setActiveModal("help")}
            />
            <SettingRow
              icon={<Feather name="file-text" size={24} color="black" />}
              label={t.profile.legal}
              onPress={() => setActiveModal("mentions")}
            />
            <SettingRow
              icon={<FontAwesome5 name="user-cog" size={22} color="black" />}
              label={t.profile.use}
              onPress={() => setActiveModal("conditions")}
            />
            <SettingRow
              icon={
                <MaterialIcons name="phonelink-lock" size={24} color="black" />
              }
              label={t.profile.confidence}
              onPress={() => setActiveModal("confidentialite")}
              isLast
            />
          </View>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>
            <FontAwesome5
              name="door-open"
              size={18}
              color="rgba(105, 10, 10, 0.77)"
            />{" "}
            {t.profile.logout}
          </Text>
        </TouchableOpacity>

        {/* Supprimer le compte */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={styles.deleteText}>
              <FontAwesome5 name="trash-alt" size={15} color="rgba(194, 16, 16, 0.62)" />{" "}
              Supprimer mon compte
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>GreenSense v1.0.0</Text>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modale contenu légal/info */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {activeModal && modalContent[activeModal]?.title}
            </Text>
            <TouchableOpacity
              onPress={() => setActiveModal(null)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalBody}>
              {activeModal && modalContent[activeModal]?.body}
            </Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f9f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6f9f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 52,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  backText: { fontSize: 24, color: "#374151", lineHeight: 28 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },

  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#fff",
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    padding: 4,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#16a34a", fontSize: 32, fontWeight: "800" },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 3,
  },
  userEmail: { fontSize: 13, color: "#6b7280" },

  section: { padding: 16, paddingBottom: 6 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  editLink: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Settings rows
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingIcon: { fontSize: 18 },
  settingLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingValue: { fontSize: 13, color: "#9ca3af" },
  settingArrow: { fontSize: 20, color: "#d1d5db", fontWeight: "600" },

  // Health card
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  infoLabel: { fontSize: 13, color: "#6b7280", fontWeight: "500", flex: 1 },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 12 },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
  },
  metric: { alignItems: "center" },
  metricValue: { fontSize: 22, fontWeight: "700", color: "#16a34a" },
  metricUnit: { fontSize: 11, color: "#6b7280", marginBottom: 2 },
  metricLabel: { fontSize: 12, color: "#6b7280" },
  metricDivider: { width: 1, backgroundColor: "#e5e7eb" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },

  deleteBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteText: { fontSize: 14, fontWeight: "600", color: "rgba(194, 16, 16, 0.62)" },

  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 16,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 14, color: "#6b7280" },
  modalScroll: { padding: 20 },
  modalBody: { fontSize: 14, color: "#374151", lineHeight: 23 },
});