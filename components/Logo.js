import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

export default function Logo({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4ade80" />
          <Stop offset="1" stopColor="#15803d" />
        </LinearGradient>
      </Defs>
      {/* Feuille principale */}
      <Path
        d="M32 6C18 6 8 18 8 34c0 10 6 20 18 24 0-14 4-26 16-36C36 18 28 26 26 40c-2-12 2-26 6-34z"
        fill="url(#leafGrad)"
      />
      {/* Nervure */}
      <Path
        d="M32 8C26 18 24 30 26 42"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </Svg>
  );
}