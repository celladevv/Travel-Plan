// Travel Companion — mobile (Expo / React Native).
// iOS + Android from one codebase. Calls the SAME /api/plan backend as the web app:
// the "brains" live server-side, this is just the UI.

import { useState } from "react";
import {
  SafeAreaView, ScrollView, View, Text, TextInput,
  TouchableOpacity, ActivityIndicator, StyleSheet,
} from "react-native";

// --- CONFIG ----------------------------------------------------------------
// While developing, point this at your laptop's LAN IP (find it with:
//   ipconfig getifaddr en0    ->  e.g. 192.168.1.42
// so your phone can reach the Node server running on your Mac.
// For production (App/Play Store), deploy the backend and use its https URL.
const API_BASE = "http://192.168.1.42:3000";

const CURRENCIES = ["MYR", "SGD", "USD", "EUR", "GBP"];

export default function App() {
  const [city, setCity] = useState("Bangkok");
  const [budget, setBudget] = useState("300");
  const [currency, setCurrency] = useState("MYR");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function plan() {
    if (!city.trim() || !budget) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          city: city.trim(), budget: Number(budget), currency, interests: interests.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const s = result?.signals;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.badge}>POWERED BY CLAUDE</Text>
        <Text style={styles.h1}>🧭 Travel Companion</Text>
        <Text style={styles.sub}>One AI-planned afternoon, wherever you are.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Bangkok" placeholderTextColor="#6b857a" />

          <Text style={styles.label}>Budget</Text>
          <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="numeric" />

          <Text style={styles.label}>Currency</Text>
          <View style={styles.chipRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCurrency(c)}
                style={[styles.chip, currency === c && styles.chipOn]}>
                <Text style={[styles.chipTxt, currency === c && styles.chipTxtOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>What are you into? (optional)</Text>
          <TextInput style={styles.input} value={interests} onChangeText={setInterests}
            placeholder="cafes, art, street food…" placeholderTextColor="#6b857a" />

          <TouchableOpacity style={styles.go} onPress={plan} disabled={loading}>
            {loading ? <ActivityIndicator color="#06231a" /> : <Text style={styles.goTxt}>Plan my afternoon</Text>}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result && s ? (
          <View style={styles.card}>
            <View style={styles.pillRow}>
              <Text style={styles.pill}>📍 {s.place.name}, {s.place.country}</Text>
              <Text style={styles.pill}>{s.weather.rainLikely ? "🌧️" : "☀️"} {s.weather.label}, {s.weather.tempC}°C</Text>
              <Text style={styles.pill}>💰 {s.budget.home} ≈ {s.budget.local}</Text>
            </View>
            <Text style={styles.plan}>{result.plan}</Text>
            {s.places?.length ? (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.placesTitle}>LIVE PLACES NEARBY</Text>
                {s.places.slice(0, 6).map((p, i) => (
                  <View key={i} style={styles.place}>
                    <Text style={styles.placeName}>{p.name}</Text>
                    {p.address ? <Text style={styles.placeAddr}>{p.address}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0d1613" },
  content: { padding: 20, paddingBottom: 60 },
  badge: { color: "#33c98f", fontSize: 11, letterSpacing: 1, textAlign: "center", marginTop: 8 },
  h1: { color: "#e8f1ec", fontSize: 24, fontWeight: "700", textAlign: "center", marginTop: 6 },
  sub: { color: "#9db8ac", fontSize: 14, textAlign: "center", marginBottom: 16 },
  card: { backgroundColor: "#142019", borderColor: "#294034", borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 14 },
  label: { color: "#9db8ac", fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: "#1c2c24", color: "#e8f1ec", borderColor: "#294034", borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#1c2c24", borderColor: "#294034", borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: "#33c98f", borderColor: "#33c98f" },
  chipTxt: { color: "#e8f1ec", fontSize: 14 },
  chipTxtOn: { color: "#06231a", fontWeight: "700" },
  go: { backgroundColor: "#33c98f", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 18 },
  goTxt: { color: "#06231a", fontWeight: "700", fontSize: 15 },
  error: { color: "#ff8a6a", fontSize: 14, marginTop: 14, textAlign: "center" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  pill: { backgroundColor: "#1c2c24", borderColor: "#294034", borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, color: "#e8f1ec", fontSize: 13 },
  plan: { color: "#e8f1ec", fontSize: 15, lineHeight: 22 },
  placesTitle: { color: "#9db8ac", fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  place: { borderLeftColor: "#33c98f", borderLeftWidth: 3, backgroundColor: "#1c2c24", padding: 10, borderRadius: 8, marginBottom: 8 },
  placeName: { color: "#e8f1ec", fontSize: 14, fontWeight: "600" },
  placeAddr: { color: "#9db8ac", fontSize: 12, marginTop: 2 },
});
