import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { db } from "../../src/lib/firebase";
import { sendMessageToGemini } from "../../src/lib/gemini";

export default function ChatScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const scrollRef = useRef(null);

  const welcomeMsg = { role: "assistant", content: t.chat.welcomeMessage, exchangeId: null };

  const [messages, setMessages] = useState([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthProfile, setHealthProfile] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [nearbyProducers, setNearbyProducers] = useState([]);

  // Mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const cacheKey = user ? `chat_history_${user.uid}` : null;

  // 1. Affichage instantané depuis le cache
  useEffect(() => {
    const loadCache = async () => {
      if (!cacheKey) return;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.length > 0) {
            setMessages([welcomeMsg, ...parsed]);
            setLoadingHistory(false);
          }
        }
      } catch (e) {
        console.error("Cache load error:", e);
      }
    };
    loadCache();
  }, [user]);

  // 2. Synchro Firestore + producteurs en arrière-plan
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      try {
        const healthSnap = await getDoc(
          doc(db, "users", user.uid, "profilSante", "data")
        );
        if (healthSnap.exists()) setHealthProfile(healthSnap.data());

        const historySnap = await getDocs(
          query(
            collection(db, "users", user.uid, "conversations"),
            orderBy("sentAt", "desc"),
            limit(20)
          )
        );

        if (!historySnap.empty) {
          const history = historySnap.docs
            .reverse()
            .flatMap((d) => {
              const data = d.data();
              return [
                { role: "user", content: data.userMessage, exchangeId: d.id },
                {
                  role: "assistant",
                  content: data.assistantMessage,
                  exchangeId: d.id,
                  linkedFarmers: data.linkedFarmers || [],
                },
              ];
            });

          setMessages([welcomeMsg, ...history]);
          if (cacheKey) {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(history));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchInitialData();
    fetchNearbyProducers();
  }, [user]);

  // Scroll automatique
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchNearbyProducers = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = null;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      // Producteurs actifs uniquement (on écarte les suspendus)
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "agriculteur"))
      );

      const actifs = new Map();
      usersSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.farmerStatus !== "suspended") {
          actifs.set(d.id, data.nom || "Producteur");
        }
      });
      if (actifs.size === 0) return setNearbyProducers([]);

      // Annonces réellement en cours, groupées par producteur
      const pubSnap = await getDocs(
        query(collection(db, "publications"), where("statut", "==", "approuve"))
      );

      const annoncesPar = {};
      pubSnap.docs.forEach((d) => {
        const p = d.data();
        if (!p.agriculteurId || !actifs.has(p.agriculteurId)) return;
        if (!annoncesPar[p.agriculteurId]) annoncesPar[p.agriculteurId] = [];
        annoncesPar[p.agriculteurId].push(
          p.produit || p.contenu?.slice(0, 40) || ""
        );
      });

      // Points de vente regroupés par producteur (évite les doublons)
      const pdvSnap = await getDocs(collection(db, "pointsDeVente"));

      const parProducteur = {};
      pdvSnap.docs.forEach((d) => {
        const point = d.data();
        const aid = point.agriculteurId;
        if (!aid || !actifs.has(aid)) return;

        let distance = null;
        if (coords && point.latitude && point.longitude) {
          distance = getDistance(coords.lat, coords.lng, point.latitude, point.longitude);
        }

        if (!parProducteur[aid]) {
          parProducteur[aid] = {
            agriculteurId: aid,
            agriculteurNom: point.agriculteurNom || actifs.get(aid),
            lieux: [],
            produits: [],
            annonces: annoncesPar[aid] || [],
            distance,
          };
        }
        const entry = parProducteur[aid];
        if (point.nom) entry.lieux.push(point.nom);
        if (distance != null && (entry.distance == null || distance < entry.distance)) {
          entry.distance = distance;
        }
      });

      // Catalogue de chaque producteur retenu
      await Promise.all(
        Object.values(parProducteur).map(async (entry) => {
          try {
            const prodSnap = await getDocs(
              collection(db, "agriculteurs", entry.agriculteurId, "produits")
            );
            entry.produits = prodSnap.docs
              .map((p) => p.data())
              .filter((p) => p.disponible !== false)
              .map((p) => p.nom);
          } catch (e) {
            // Catalogue inaccessible pour ce producteur, on ignore silencieusement
          }
        })
      );

      const result = Object.values(parProducteur)
        .filter((p) => p.produits.length > 0 || p.annonces.length > 0)
        .sort((a, b) => {
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        })
        .slice(0, 5);

      setNearbyProducers(result);
    } catch (e) {
      console.error("[Vita] ERREUR producteurs proches:", e.code || "", e.message);
      setNearbyProducers([]);
    }
  };

  const buildSystemPrompt = () => {
    let prompt = `Tu es Vita, l'assistant nutritionnel de GreenSense, une application malgache. Imagine que tu es un ami bienveillant qui s'y connaît vraiment en nutrition et en cuisine locale — pas un robot, pas un médecin froid.

TON CARACTÈRE ET TA FAÇON DE PARLER :
- Tu es chaleureux, encourageant et positif, comme un ami qui veut sincèrement aider
- Tu parles de façon naturelle et décontractée, avec des phrases simples
- Tu peux utiliser quelques expressions malgaches familières quand ça sonne juste (mais sans en abuser)
- Tu poses parfois une petite question pour mieux comprendre, comme dans une vraie conversation
- Tu utilises des emojis avec parcimonie pour rendre l'échange vivant, jamais à chaque phrase
- Tu évites le jargon technique : tu expliques simplement, comme à un ami
- Tu ne fais pas de longues listes froides : tu racontes, tu suggères, tu donnes envie

TON STYLE D'ÉCRITURE (TRÈS IMPORTANT) :
- N'utilise JAMAIS de Markdown : pas d'astérisques, pas de listes à puces, pas de dièses, pas de gras
- Écris en texte simple et naturel, comme un message WhatsApp à un ami
- Sois CONCIS : 2 à 4 phrases en général, sauf si on te demande explicitement un menu complet
- Va droit au but avec chaleur, sans tourner autour du pot
- Si tu dois énumérer, fais-le dans une phrase fluide plutôt qu'en liste

CE QUE TU FAIS :
- Tu donnes des conseils nutritionnels concrets adaptés à la vie à Madagascar
- Tu valorises les bons produits locaux (vary, brèdes, poissons, fruits tropicaux, légumineuses...) avec enthousiasme
- Tu t'adaptes à ce que la personne te raconte et tu te souviens de vos échanges
- Quand on te demande un menu, tu le donnes vraiment, en entier, mais avec un ton gourmand et donnant envie

CE QUE TU NE FAIS JAMAIS :
- Tu ne donnes jamais l'impression de réciter un manuel
- Tu ne remplaces pas un médecin : si quelque chose touche à la santé sérieuse, tu le rappelles gentiment et tu suggères de consulter
- Tu ne juges jamais, tu encourages toujours
- Tu n'inventes JAMAIS de numéro de téléphone, d'adresse ou de coordonnées`;

    if (healthProfile) {
      prompt += `\n\nCE QUE TU SAIS SUR TON AMI (utilise-le naturellement, sans le réciter comme une fiche) :
- Poids : ${healthProfile.poids} kg, Taille : ${healthProfile.taille} cm, IMC : ${healthProfile.imc}
- Pathologies : ${healthProfile.pathologies?.join(", ") || "aucune"}
- Objectifs : ${healthProfile.objectifs?.join(", ") || "aucun"}
- Allergies : ${healthProfile.allergies?.join(", ") || "aucune"}

Garde ça en tête dans tes conseils, mais parle-en avec tact, comme un ami attentionné — pas en énumérant ses données.`;
    } else {
      prompt += `\n\nTon ami n'a pas encore rempli son profil santé. Tu peux gentiment l'inviter à le faire pour que tu puisses mieux l'aider, mais sans insister lourdement.`;
    }

    if (nearbyProducers.length > 0) {
      prompt += `\n\nPRODUCTEURS ACTIFS PRÈS DE TON AMI :`;
      nearbyProducers.forEach((p) => {
        const dist = p.distance != null
          ? (p.distance < 1 ? `${Math.round(p.distance * 1000)} m` : `${p.distance.toFixed(1)} km`)
          : "distance inconnue";
        prompt += `\n- ${p.agriculteurNom} (${p.lieux.join(", ") || "lieu non précisé"}), à ${dist}`;
        if (p.produits.length > 0) prompt += `\n  cultive : ${p.produits.join(", ")}`;
        if (p.annonces.length > 0) prompt += `\n  vend actuellement : ${p.annonces.join(", ")}`;
      });
      prompt += `\n\nRÈGLES STRICTES SUR LES PRODUCTEURS :
- Ne cite un producteur QUE s'il propose vraiment ce dont ton ami parle. Si aucun ne correspond, dis-le simplement et n'en cite aucun.
- Ne cite jamais plus d'un ou deux producteurs dans une réponse, et jamais deux fois le même.
- Distingue bien « cultive » (son activité habituelle) et « vend actuellement » (ses annonces du moment).
- Cite son nom EXACTEMENT tel qu'écrit ci-dessus.
- N'invente jamais de numéro, d'adresse ni de disponibilité.

SI ON TE DEMANDE LE CONTACT D'UN PRODUCTEUR :
Cite son nom exact et indique que sa fiche complète s'ouvre juste en dessous de ton message. Une ou deux phrases suffisent.`;
    }

    return prompt;
  };

  // Repère les producteurs cités dans une réponse, pour proposer un lien vers leur fiche
  const detectMentionedFarmers = (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];
    nearbyProducers.forEach((p) => {
      if (!p.agriculteurId) return;
      const names = [p.agriculteurNom, ...(p.lieux || [])].filter(Boolean);
      const mentioned = names.some((n) => lower.includes(n.toLowerCase()));
      if (mentioned && !found.some((f) => f.agriculteurId === p.agriculteurId)) {
        found.push({ agriculteurId: p.agriculteurId, label: p.agriculteurNom });
      }
    });
    return found;
  };

  const handleSend = async (messageText = null) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    const userMessage = { role: "user", content: textToSend, exchangeId: null };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const responseText = await sendMessageToGemini(
        newMessages,
        buildSystemPrompt()
      );

      const linkedFarmers = detectMentionedFarmers(responseText);

      const docRef = await addDoc(collection(db, "users", user.uid, "conversations"), {
        userMessage: textToSend,
        assistantMessage: responseText,
        linkedFarmers,
        sentAt: serverTimestamp(),
      });

      const finalMessages = [
        ...messages,
        { role: "user", content: textToSend, exchangeId: docRef.id },
        {
          role: "assistant",
          content: responseText,
          exchangeId: docRef.id,
          linkedFarmers,
        },
      ];
      setMessages(finalMessages);

      if (cacheKey) {
        const toCache = finalMessages.filter((m) => m.exchangeId !== null);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(toCache));
      }
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t.chat.errorMessage, exchangeId: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLongPress = (exchangeId) => {
    if (!exchangeId) return;
    setSelectionMode(true);
    setSelectedIds([exchangeId]);
  };

  const toggleSelect = (exchangeId) => {
    if (!exchangeId) return;
    setSelectedIds((prev) =>
      prev.includes(exchangeId)
        ? prev.filter((id) => id !== exchangeId)
        : [...prev, exchangeId]
    );
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Supprimer",
      `Supprimer ${selectedIds.length} message(s) ? Vita oubliera aussi ces échanges.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(
                selectedIds.map((id) =>
                  deleteDoc(doc(db, "users", user.uid, "conversations", id))
                )
              );

              const remaining = messages.filter(
                (m) => m.exchangeId === null || !selectedIds.includes(m.exchangeId)
              );
              setMessages(remaining);

              if (cacheKey) {
                const toCache = remaining.filter((m) => m.exchangeId !== null);
                await AsyncStorage.setItem(cacheKey, JSON.stringify(toCache));
              }

              cancelSelection();
            } catch (e) {
              console.error(e);
              Alert.alert("Erreur", "Impossible de supprimer");
            }
          },
        },
      ]
    );
  };

  const clearAll = () => {
    Alert.alert(
      "Tout effacer",
      "Supprimer toute la conversation ? Vita repartira de zéro.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Tout effacer",
          style: "destructive",
          onPress: async () => {
            try {
              const snap = await getDocs(
                collection(db, "users", user.uid, "conversations")
              );
              await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
              setMessages([welcomeMsg]);
              if (cacheKey) await AsyncStorage.removeItem(cacheKey);
              cancelSelection();
            } catch (e) {
              console.error(e);
              Alert.alert("Erreur", "Impossible d'effacer");
            }
          },
        },
      ]
    );
  };

  if (loadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header vert organique */}
      <View style={styles.headerBg}>
        <View style={styles.headerContent}>
          {selectionMode ? (
            <>
              <TouchableOpacity onPress={cancelSelection} style={styles.backBtn}>
                <Text style={styles.backText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>{selectedIds.length} sélectionné(s)</Text>
              </View>
              <TouchableOpacity onPress={deleteSelected} style={styles.backBtn}>
                <Ionicons name="trash-outline" size={20} color="rgba(7, 7, 7, 0.7)" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>‹</Text>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.botBadge}>
                    <Text style={styles.botBadgeText}>🌿</Text>
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Vita</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.headerSub}>Assistant nutrition</Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={clearAll} style={styles.backBtn}>
                <Ionicons name="trash-outline" size={20} color="rgba(7, 7, 7, 0.7)" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeEmoji}>🌿</Text>
                <Text style={styles.welcomeTitle}>Salut ! Moi c'est Vita</Text>
                <Text style={styles.welcomeText}>
                  Je suis là pour t'aider à bien manger avec les bons produits de chez nous.
                </Text>
              </View>

              <Text style={styles.suggestionsTitle}>{t.chat.suggestions.title}</Text>
              <View style={styles.suggestionsGrid}>
                {t.chat.suggestions.items.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionBtn}
                    onPress={() => handleSend(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Text style={styles.suggestionArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, index) => {
            const isSelected = msg.exchangeId && selectedIds.includes(msg.exchangeId);
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={selectionMode ? 0.6 : 1}
                onLongPress={() => handleLongPress(msg.exchangeId)}
                onPress={() => selectionMode && toggleSelect(msg.exchangeId)}
                style={[
                  styles.messageRow,
                  msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
                  isSelected && styles.messageRowSelected,
                ]}
              >
                {msg.role === "assistant" && (
                  <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>🌿</Text>
                  </View>
                )}

                <View style={styles.bubbleWrap}>
                  <View
                    style={[
                      styles.bubble,
                      msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                      isSelected && styles.bubbleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        msg.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>

                  {/* Fiches des producteurs cités */}
                  {msg.role === "assistant" &&
                    msg.linkedFarmers?.length > 0 &&
                    !selectionMode && (
                      <View style={styles.farmerLinks}>
                        {msg.linkedFarmers.map((f) => (
                          <TouchableOpacity
                            key={f.agriculteurId}
                            style={styles.farmerLinkBtn}
                            onPress={() =>
                              router.push(`/(consumer)/agriculteur/${f.agriculteurId}`)
                            }
                            activeOpacity={0.7}
                          >
                            <Text style={styles.farmerLinkIcon}>👤</Text>
                            <Text style={styles.farmerLinkText} numberOfLines={1}>
                              {f.label}
                            </Text>
                            <Text style={styles.farmerLinkArrow}>›</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                </View>

                {selectionMode && msg.exchangeId && msg.role === "user" && (
                  <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {loading && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>🌿</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#16a34a" />
                <Text style={styles.typingText}>{t.chat.thinking}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {!selectionMode && (
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t.chat.placeholder}
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.sendBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f9f6" },
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f9f6",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6b7280" },
  headerBg: {
    backgroundColor: "rgba(1, 117, 20, 0.75)", marginTop: 50,
    paddingTop: 22, paddingBottom: 22, paddingHorizontal: 16, overflow: "hidden",
  },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 100, backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  backText: { fontSize: 22, color: "#fff", lineHeight: 26 },
  deleteIcon: { fontSize: 16 },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  botBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  botBadgeText: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#86efac" },
  headerSub: { fontSize: 12, color: "#dcfce7" },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  suggestions: { marginBottom: 20 },
  welcomeCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  welcomeEmoji: { fontSize: 36, marginBottom: 8 },
  welcomeTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 6 },
  welcomeText: { fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 19 },
  suggestionsTitle: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 10 },
  suggestionsGrid: { gap: 8 },
  suggestionBtn: {
    backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  suggestionText: { fontSize: 13, color: "#374151", flex: 1 },
  suggestionArrow: { fontSize: 18, color: "#16a34a", fontWeight: "700" },
  messageRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end", gap: 8 },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAssistant: { justifyContent: "flex-start" },
  messageRowSelected: {
    backgroundColor: "#dcfce7", borderRadius: 12,
    marginHorizontal: -6, paddingHorizontal: 6, paddingVertical: 4,
  },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#dcfce7",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  botAvatarText: { fontSize: 16 },
  bubbleWrap: { maxWidth: "76%" },
  bubble: { borderRadius: 18, paddingVertical: 11, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: "#16a34a", borderBottomRightRadius: 5 },
  bubbleAssistant: {
    backgroundColor: "#fff", borderBottomLeftRadius: 5, borderWidth: 1, borderColor: "#f3f4f6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bubbleSelected: { borderColor: "#16a34a", borderWidth: 1.5 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: "#fff" },
  bubbleTextAssistant: { color: "#1f2937" },
  farmerLinks: { marginTop: 8, gap: 6 },
  farmerLinkBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
  },
  farmerLinkIcon: { fontSize: 14 },
  farmerLinkText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#15803d" },
  farmerLinkArrow: { fontSize: 18, color: "#16a34a", lineHeight: 20 },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 13, color: "#6b7280" },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#16a34a",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  checkCircleActive: { backgroundColor: "#16a34a" },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  inputArea: {
    flexDirection: "row", alignItems: "flex-end", padding: 12, backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#f3f4f6", gap: 8,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 11, fontSize: 14, color: "#111827",
    maxHeight: 100, backgroundColor: "#f9fafb",
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#16a34a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: "#d1d5db", shadowOpacity: 0 },
  sendBtnText: { color: "#fff", fontSize: 26, lineHeight: 30, fontWeight: "600" },
});