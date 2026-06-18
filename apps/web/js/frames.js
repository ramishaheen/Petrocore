/* PETROCORE — cinematic scroll-scrub frame manifest.
 * Each entry is a Higgsfield-generated cinematic still of the timepiece.
 * The hero <canvas> cross-dissolves through these frames as you scroll,
 * turning the watch from a full case view, through the dial and movement,
 * to its lume glow and finally on the wrist.
 *
 * Order = the scroll story: Case → Profile → Dial → Movement → Lume → Wrist.
 *
 * The build sandbox's egress blocks vendoring the bytes locally, so these
 * reference the Higgsfield CDN directly (a visitor's browser loads them fine).
 * To self-host: download each URL into assets/frames/ and swap the paths.
 */
window.PETROCORE_FRAMES = [
  // 0 — the case (hero / front macro)
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_231700_756271ec-baa5-45b3-9559-de37f27aa904.png",
  // 1 — three-quarter angle
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_231734_e74ee4d4-bd33-4f75-9559-70c9cb657e0b.png",
  // 2 — side profile / crown & pushers
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_231950_c9e854ef-674f-4001-b2d5-9773a0d2b2b9.png",
  // 3 — top-down dial
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_231829_b07ca889-d94e-4490-a61c-a803ae2f04df.png",
  // 4 — exhibition caseback / movement
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_232042_638d62bb-fd33-43f9-b84a-061c67c5a26a.png",
  // 5 — lume glow in darkness
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_232111_8282c04b-eecd-4264-9546-869ea2fc04f9.png",
  // 6 — on the wrist
  "https://d8j0ntlcm91z4.cloudfront.net/user_2whIQnXT6z1DfEo8OTTSyHeZ2gr/hf_20260618_232151_f1170930-0737-4a84-88e9-457890f3d718.png"
];
