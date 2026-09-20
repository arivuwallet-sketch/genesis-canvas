import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAudioStore, type AudioSource, type AudioZone } from "../store/useAudioStore";

function makeReverbImpulse(context: AudioContext, seconds: number, decay: number) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
}

function AudioListenerBridge({ onReady }: { onReady: (listener: THREE.AudioListener | null) => void }) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const listener = new THREE.AudioListener();
    camera.add(listener);
    onReady(listener);

    const resume = () => {
      void listener.context.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", resume, { passive: true });
    window.addEventListener("keydown", resume, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      camera.remove(listener);
      listener.gain.disconnect();
      onReady(null);
    };
  }, [camera, onReady]);

  return null;
}

function SpatialSource({
  source,
  listener,
  zones,
}: {
  source: AudioSource;
  listener: THREE.AudioListener;
  zones: AudioZone[];
}) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const audioRef = useRef<THREE.PositionalAudio | null>(null);
  const activeZoneRef = useRef<string | null>(null);

  const filters = useMemo(() => {
    const context = listener.context;
    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    const convolver = context.createConvolver();
    return { lowPass, convolver };
  }, [listener]);

  useEffect(() => {
    const audio = new THREE.PositionalAudio(listener);
    audioRef.current = audio;
    audio.position.set(...source.position);
    scene.add(audio);
    audio.setVolume(Math.max(0, Math.min(1, source.volume)));
    audio.setRefDistance(Math.max(0.1, source.refDistance));
    audio.setMaxDistance(Math.max(source.refDistance, source.maxDistance));
    audio.setLoop(source.loop);

    const loader = new THREE.AudioLoader();
    let disposed = false;
    loader.load(
      source.url,
      (buffer) => {
        if (disposed) return;
        audio.setBuffer(buffer);
        if (source.autoplay && !audio.isPlaying) {
          void listener.context.resume().then(() => {
            if (!audio.isPlaying) audio.play();
          }).catch(() => undefined);
        }
      },
      undefined,
      (error) => console.warn("[SoundManager] Could not load audio", source.url, error),
    );

    return () => {
      disposed = true;
      if (audio.isPlaying) audio.stop();
      scene.remove(audio);
      audio.disconnect();
      audioRef.current = null;
    };
  }, [listener, scene, source]);

  useFrame(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let active: AudioZone | undefined;
    const listenerPosition = new THREE.Vector3();
    camera.getWorldPosition(listenerPosition);
    for (const zone of zones) {
      const inside =
        listenerPosition.x >= zone.min[0] &&
        listenerPosition.x <= zone.max[0] &&
        listenerPosition.y >= zone.min[1] &&
        listenerPosition.y <= zone.max[1] &&
        listenerPosition.z >= zone.min[2] &&
        listenerPosition.z <= zone.max[2];
      if (inside) {
        active = zone;
        break;
      }
    }

    if (!active) {
      if (activeZoneRef.current !== null) {
        audio.setFilters([]);
        activeZoneRef.current = null;
      }
      return;
    }

    if (activeZoneRef.current === active.id) return;
    filters.lowPass.frequency.value = active.lowPassFrequency;
    filters.lowPass.Q.value = 0.85;
    filters.convolver.buffer = makeReverbImpulse(listener.context, active.reverbSeconds, active.reverbDecay);
    audio.setFilters([filters.lowPass, filters.convolver]);
    activeZoneRef.current = active.id;
  });

  return null;
}

export function SoundManager() {
  const enabled = useAudioStore((state) => state.enabled);
  const sources = useAudioStore((state) => state.sources);
  const zones = useAudioStore((state) => state.zones);
  const [listener, setListener] = useState<THREE.AudioListener | null>(null);

  return (
    <>
      <AudioListenerBridge onReady={setListener} />
      {enabled && listener
        ? sources.map((source) => (
            <SpatialSource key={source.id} source={source} listener={listener} zones={zones} />
          ))
        : null}
    </>
  );
}

