import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { sendMessageToGemini } from "../../src/lib/gemini";import { useAuth } from "../../src/context/AuthContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useRouter } from "expo-router";

export default function ChatScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: t.chat.welcomeMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthProfile, setHealthProfile] = useState(null);

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
      }
    };
    fetchHealthProfile();
  }, [user]);

  // Scroll automatique vers le bas
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const buildSystemPrompt = () => {
    let prompt = `Tu es un assistant nutritionnel intelligent intégré à l'application GreenSense, une plateforme de recommandations nutritionnelles personnalisées basée à Madagascar. 
    
Tu dois :
- Donner des conseils nutritionnels personnalisés et pratiques
- Suggérer des aliments et menus adaptés au profil de santé de l'utilisateur
- Valoriser les produits agricoles locaux malgaches quand c'est pertinent
- Répondre en français de façon claire, bienveillante et professionnelle
- Ne jamais remplacer un avis médical professionnel
- Toujours préciser que tes recommandations sont éducatives et non médicales`;

    if (healthProfile) {
      prompt += `\n\nProfil de santé de l'utilisateur :
- Poids : ${healthProfile.poids} kg
- Taille : ${healthProfile.taille} cm
- IMC : ${healthProfile.imc}
- Pathologies : ${healthProfile.pathologies?.join(", ") || "aucune"}
- Objectifs nutritionnels : ${healthProfile.objectifs?.join(", ") || "aucun"}
- Allergies : ${healthProfile.allergies?.join(", ") || "aucune"}

Tiens compte de ces informations dans toutes tes réponses.`;
    } else {
      prompt += `\n\nL'utilisateur n'a pas encore renseigné son profil de santé. Encourage-le à le compléter pour des recommandations plus personnalisées.`;
    }

    return prompt;
  };

  const handleSend = async (messageText = null) => {
  const textToSend = messageText || input.trim();

  if (!textToSend || loading) return;

  const userMessage = {
    role: "user",
    content: textToSend,
  };

  const newMessages = [...messages, userMessage];

  setMessages(newMessages);
  setInput("");
  setLoading(true);

  try {
    // Envoi à Gemini
    const responseText = await sendMessageToGemini(
      newMessages,
      buildSystemPrompt()
    );

    const assistantMessage = {
      role: "assistant",
      content: responseText,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Sauvegarde Firestore
    if (user) {
      await addDoc(collection(db, "conversations"), {
        userId: user.uid,
        userMessage: textToSend,
        assistantMessage: responseText,
        sentAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Gemini Error:", error);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: t.chat.errorMessage,
      },
    ]);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.chat.title}</Text>
          <Text style={styles.headerSub}>{t.chat.subtitle}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerEmoji}>🤖</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Suggestions */}
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>{t.chat.suggestions.title}</Text>
              <View style={styles.suggestionsGrid}>
                {t.chat.suggestions.items.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionBtn}
                    onPress={() => handleSend(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Messages */}
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageRow,
                msg.role === "user" ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {msg.role === "assistant" && (
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarText}>🌿</Text>
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
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
            </View>
          ))}

          {/* Indicateur de chargement */}
          {loading && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>🌿</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <ActivityIndicator size="small" color="#16a34a" />
                <Text style={[styles.bubbleText, styles.bubbleTextAssistant, { marginTop: 4 }]}>
                  {t.chat.thinking}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t.chat.placeholder}
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>›</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  backText: {
    fontSize: 24,
    color: "#374151",
    lineHeight: 28,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  headerSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  headerRight: {
    width: 36,
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 24,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  suggestions: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 10,
    textAlign: "center",
  },
  suggestionsGrid: {
    gap: 8,
  },
  suggestionBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  suggestionText: {
    fontSize: 13,
    color: "#374151",
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  botAvatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: "#16a34a",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#fff",
  },
  bubbleTextAssistant: {
    color: "#111827",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
    backgroundColor: "#f9fafb",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#d1d5db",
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 24,
    lineHeight: 28,
  },
});