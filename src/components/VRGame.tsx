import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createXRStore, XR, useXRControllerButtonEvent, useXRInputSourceState } from '@react-three/xr';
import * as THREE from 'three';
import { Text, PointerLockControls, Sky } from '@react-three/drei';
import { useGameStore } from '../store';
import { distance, latLngToVector3, vector3ToLatLng } from '../utils';
import { Google3DTiles } from './Google3DTiles';

const store = createXRStore({
  controller: {
    right: {
      rayPointer: {},
    },
  },
});

function useKeyboard() {
  const keys = useRef({ w: false, a: false, s: false, d: false, e: false });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) keys.current[key as keyof typeof keys.current] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) keys.current[key as keyof typeof keys.current] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  return keys;
}

function Car() {
  const playerMode = useGameStore(state => state.playerMode);
  const playerLocation = useGameStore(state => state.playerLocation);
  const carLocation = useGameStore(state => state.carLocation);
  const carHeading = useGameStore(state => state.carHeading);
  const setPlayerMode = useGameStore(state => state.setPlayerMode);
  const setCarLocation = useGameStore(state => state.setCarLocation);
  const setCarHeading = useGameStore(state => state.setCarHeading);
  const setPlayerLocation = useGameStore(state => state.setPlayerLocation);
  
  const rightController = useXRInputSourceState('controller', 'right');
  const leftController = useXRInputSourceState('controller', 'left');
  
  const speed = useRef(0);
  const steering = useRef(0);
  const keys = useKeyboard();
  
  useFrame((state, delta) => {
    if (playerMode === 'driving') {
      let accel = 0;
      let steer = 0;
      
      if (rightController?.gamepad) {
        const trigger = rightController.gamepad.buttons[0]?.value || 0;
        accel += trigger * 15; // Acceleration
      }
      
      if (leftController?.gamepad) {
        const trigger = leftController.gamepad.buttons[0]?.value || 0;
        accel -= trigger * 15; // Braking/Reverse
        steer = leftController.gamepad.axes[2] || 0; // Thumbstick X
      }

      if (keys.current.w) accel += 15;
      if (keys.current.s) accel -= 15;
      if (keys.current.a) steer += 1;
      if (keys.current.d) steer -= 1;
      
      speed.current += accel * delta;
      speed.current *= 0.95; // Friction
      
      if (Math.abs(speed.current) > 0.1) {
        steering.current = steer * 1.5; // Max steering angle
        const headingChange = (speed.current / 3) * Math.tan(steering.current) * delta;
        setCarHeading(carHeading + headingChange);
      }
      
      if (Math.abs(speed.current) > 0.1) {
        const dZ = -Math.cos(carHeading) * speed.current * delta;
        const dX = Math.sin(carHeading) * speed.current * delta;
        
        const newLoc = vector3ToLatLng(carLocation.lat, carLocation.lng, new THREE.Vector3(dX, 0, dZ));
        setCarLocation(newLoc);
        setPlayerLocation(newLoc);
      }
    }
  });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        const state = useGameStore.getState();
        if (state.playerMode === 'walking') {
          const dist = distance(state.playerLocation.lat, state.playerLocation.lng, state.carLocation.lat, state.carLocation.lng);
          if (dist < 5) {
            state.setPlayerMode('driving');
          }
        } else if (state.playerMode === 'driving') {
          state.setPlayerMode('walking');
          const exitOffset = new THREE.Vector3(2, 0, 0);
          exitOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.carHeading);
          const newLoc = vector3ToLatLng(state.carLocation.lat, state.carLocation.lng, exitOffset);
          state.setPlayerLocation(newLoc);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useXRControllerButtonEvent(rightController, 'a-button', (state) => {
    if (state === 'pressed') {
      if (playerMode === 'walking') {
        const dist = distance(playerLocation.lat, playerLocation.lng, carLocation.lat, carLocation.lng);
        if (dist < 5) {
          setPlayerMode('driving');
        }
      } else if (playerMode === 'driving') {
        setPlayerMode('walking');
        const exitOffset = new THREE.Vector3(2, 0, 0);
        exitOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carHeading);
        const newLoc = vector3ToLatLng(carLocation.lat, carLocation.lng, exitOffset);
        setPlayerLocation(newLoc);
      }
    }
  });

  let position = new THREE.Vector3(0, 0, 0);
  let rotation = [0, -carHeading, 0] as [number, number, number];
  
  if (playerMode === 'walking') {
    position = latLngToVector3(playerLocation.lat, playerLocation.lng, carLocation.lat, carLocation.lng);
  }

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="red" />
      </mesh>
      <mesh position={[0, 1.25, -0.5]}>
        <boxGeometry args={[1.8, 0.5, 2]} />
        <meshStandardMaterial color="darkred" />
      </mesh>
      <mesh position={[1, 0.25, 1.5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-1, 0.25, 1.5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[1, 0.25, -1.5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[-1, 0.25, -1.5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
      
      {playerMode === 'walking' && distance(playerLocation.lat, playerLocation.lng, carLocation.lat, carLocation.lng) < 5 && (
        <Text position={[0, 2.5, 0]} fontSize={0.3} color="white" outlineWidth={0.02} outlineColor="black">
          Press A (VR) or E (Screen) to Enter
        </Text>
      )}
      {playerMode === 'driving' && (
        <Text position={[0, 1, -1]} fontSize={0.2} color="white" outlineWidth={0.02} outlineColor="black">
          VR: Triggers to Drive, Thumbstick to Steer, A to Exit
          Screen: W/A/S/D to Drive, E to Exit
        </Text>
      )}
    </group>
  );
}

function NPC({ lat, lng, name, dialogue }: { lat: number, lng: number, name: string, dialogue: string }) {
  const playerLocation = useGameStore(state => state.playerLocation);
  const position = latLngToVector3(playerLocation.lat, playerLocation.lng, lat, lng);
  const dist = distance(playerLocation.lat, playerLocation.lng, lat, lng);
  
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="peachpuff" />
      </mesh>
      
      {dist < 10 && (
        <Text position={[0, 2.5, 0]} fontSize={0.3} color="white" outlineWidth={0.02} outlineColor="black">
          {name}
        </Text>
      )}
      {dist < 5 && (
        <Text position={[0, 2.2, 0]} fontSize={0.2} color="yellow" outlineWidth={0.02} outlineColor="black" maxWidth={2} textAlign="center">
          {dialogue}
        </Text>
      )}
    </group>
  );
}

function MissionItem({ lat, lng, name, onPickup }: { lat: number, lng: number, name: string, onPickup: () => void }) {
  const playerLocation = useGameStore(state => state.playerLocation);
  const playerMode = useGameStore(state => state.playerMode);
  const position = latLngToVector3(playerLocation.lat, playerLocation.lng, lat, lng);
  const dist = distance(playerLocation.lat, playerLocation.lng, lat, lng);
  
  const rightController = useXRInputSourceState('controller', 'right');
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        const state = useGameStore.getState();
        const currentDist = distance(state.playerLocation.lat, state.playerLocation.lng, lat, lng);
        if (state.playerMode === 'walking' && currentDist < 3) {
          onPickup();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lat, lng, onPickup]);

  useXRControllerButtonEvent(rightController, 'a-button', (state) => {
    if (state === 'pressed' && playerMode === 'walking' && dist < 3) {
      onPickup();
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="gold" />
      </mesh>
      
      {dist < 10 && (
        <Text position={[0, 1.5, 0]} fontSize={0.3} color="white" outlineWidth={0.02} outlineColor="black">
          {name}
        </Text>
      )}
      {dist < 3 && playerMode === 'walking' && (
        <Text position={[0, 1.2, 0]} fontSize={0.2} color="yellow" outlineWidth={0.02} outlineColor="black">
          Press A (VR) or E (Screen) to Pick Up
        </Text>
      )}
    </group>
  );
}

function PlayerController() {
  const { camera } = useThree();
  const playerMode = useGameStore(state => state.playerMode);
  const playerLocation = useGameStore(state => state.playerLocation);
  const setPlayerLocation = useGameStore(state => state.setPlayerLocation);
  const keys = useKeyboard();
  
  const rightController = useXRInputSourceState('controller', 'right');
  
  useXRControllerButtonEvent(rightController, 'xr-standard-trigger', (state) => {
    if (state === 'pressed' && playerMode === 'walking') {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      
      const dist = 10;
      const dZ = direction.z * dist;
      const dX = direction.x * dist;
      
      const newLoc = vector3ToLatLng(playerLocation.lat, playerLocation.lng, new THREE.Vector3(dX, 0, dZ));
      setPlayerLocation(newLoc);
    }
  });

  useFrame((state, delta) => {
    if (playerMode === 'walking') {
      let moved = false;
      const speed = 5; // m/s
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
      const moveDir = new THREE.Vector3();

      if (keys.current.w) { moveDir.add(direction); moved = true; }
      if (keys.current.s) { moveDir.sub(direction); moved = true; }
      if (keys.current.a) { moveDir.sub(right); moved = true; }
      if (keys.current.d) { moveDir.add(right); moved = true; }

      if (moved) {
        moveDir.normalize();
        const dZ = moveDir.z * speed * delta;
        const dX = moveDir.x * speed * delta;
        const newLoc = vector3ToLatLng(playerLocation.lat, playerLocation.lng, new THREE.Vector3(dX, 0, dZ));
        setPlayerLocation(newLoc);
      }
    }
  });

  if (playerMode === 'driving') return null;

  return (
    <group>
      <mesh position={[0.1, -0.1, -0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function GameLogic() {
  const playerLocation = useGameStore(state => state.playerLocation);
  const playerMode = useGameStore(state => state.playerMode);
  const step = useGameStore(state => state.missionStep);
  const setMissionStep = useGameStore(state => state.setMissionStep);
  
  useEffect(() => {
    if (step === 0) {
      const distToBob = distance(playerLocation.lat, playerLocation.lng, 30.1764, -85.7725);
      if (distToBob < 5) {
        setMissionStep(1);
      }
    } else if (step === 1) {
      if (playerMode === 'driving') {
        setMissionStep(2);
      }
    } else if (step === 3) {
      const distToDelivery = distance(playerLocation.lat, playerLocation.lng, 30.1550, -85.7600);
      if (distToDelivery < 15) {
        setMissionStep(4);
      }
    }
  }, [playerLocation, playerMode, step, setMissionStep]);
  
  return null;
}

function MissionUI() {
  const step = useGameStore(state => state.missionStep);
  
  let objective = "";
  if (step === 0) objective = "Talk to Bob (Look for the blue guy nearby).";
  else if (step === 1) objective = "Get in the red car (Press A Button).";
  else if (step === 2) objective = "Drive to Joan Ave and pick up the package.";
  else if (step === 3) objective = "Deliver the package to North Lagoon.";
  else if (step === 4) objective = "Mission Complete! Free Roam.";

  return (
    <div className="absolute top-4 right-4 z-10 bg-zinc-900/80 backdrop-blur text-white px-6 py-4 rounded-xl text-sm max-w-sm border border-zinc-800 shadow-xl">
      <h3 className="font-bold text-emerald-400 mb-2 text-lg">Current Objective</h3>
      <p className="text-zinc-200">{objective}</p>
    </div>
  );
}

export default function VRGame() {
  // @ts-ignore
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const location = useGameStore(state => state.playerLocation);
  const step = useGameStore(state => state.missionStep);
  const setMissionStep = useGameStore(state => state.setMissionStep);
  const setPackagePickedUp = useGameStore(state => state.setPackagePickedUp);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900 text-white p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Google Maps API Key Required</h1>
          <p className="mb-4 text-zinc-400">
            To render real Street View images of Panama City Beach, you need to provide a Google Maps API Key with the Street View Static API enabled.
          </p>
          <p className="text-sm text-zinc-500">
            Add <code className="bg-zinc-800 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative bg-black">
      <GameLogic />
      <MissionUI />
      
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <button
          onClick={() => store.enterVR()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-colors"
        >
          Enter VR
        </button>
        <div className="bg-zinc-900/80 backdrop-blur text-white px-4 py-3 rounded-xl text-sm font-mono flex items-center">
          Lat: {location.lat.toFixed(5)} | Lng: {location.lng.toFixed(5)}
        </div>
      </div>
      
      <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/80 backdrop-blur text-white px-4 py-3 rounded-xl text-sm max-w-md">
        <h3 className="font-bold mb-1 text-emerald-400">Controls</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold text-zinc-400 text-xs uppercase mb-1">Screen</h4>
            <ul className="list-disc pl-4 text-zinc-300 text-xs space-y-1">
              <li>Click game to lock mouse</li>
              <li>Mouse to look around</li>
              <li>W/A/S/D to move/drive</li>
              <li>E to interact / enter car</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-zinc-400 text-xs uppercase mb-1">VR</h4>
            <ul className="list-disc pl-4 text-zinc-300 text-xs space-y-1">
              <li>Look around to aim</li>
              <li>Right Trigger to jump</li>
              <li>A Button to interact</li>
              <li>Triggers & Thumbstick to drive</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 w-48 h-48 rounded-full overflow-hidden border-4 border-zinc-800 shadow-xl">
        <img 
          src={`https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=18&size=400x400&maptype=satellite&markers=color:red%7C${location.lat},${location.lng}&key=${apiKey}`}
          alt="Minimap"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <Canvas>
        <PointerLockControls />
        <XR store={store}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <Sky sunPosition={[100, 20, 100]} />
          
          <Google3DTiles apiKey={apiKey} lat={30.1765} lng={-85.7725} />
          <PlayerController />
          <Car />
          
          <NPC 
            lat={30.1764} 
            lng={-85.7725} 
            name="Bob" 
            dialogue={step === 0 ? "Hey! Get in the car and grab the package at Joan Ave." : "What are you waiting for? Go!"} 
          />
          
          {step === 2 && (
            <MissionItem 
              lat={30.1750} 
              lng={-85.7650} 
              name="Secret Package" 
              onPickup={() => {
                setPackagePickedUp(true);
                setMissionStep(3);
              }} 
            />
          )}
          
          {step === 3 && (
            <NPC 
              lat={30.1550} 
              lng={-85.7600} 
              name="Contact" 
              dialogue="Do you have the package?" 
            />
          )}
        </XR>
      </Canvas>
    </div>
  );
}
