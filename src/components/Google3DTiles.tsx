import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin, ReorientationPlugin } from '3d-tiles-renderer/plugins';
import { Text } from '@react-three/drei';

export function Google3DTiles({ apiKey, lat, lng }: { apiKey: string, lat: number, lng: number }) {
  const { scene, camera, gl } = useThree();
  const tilesRendererRef = useRef<TilesRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    // Pre-flight check to prevent 3d-tiles-renderer from crashing on invalid API key
    fetch(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error.message || "Invalid Google Maps API Key");
          setIsValid(false);
        } else if (!data.root) {
          setError("Unexpected response from Google Maps API");
          setIsValid(false);
        } else {
          setError(null);
          setIsValid(true);
        }
      })
      .catch(err => {
        setError("Failed to connect to Google Maps API");
        setIsValid(false);
      });
  }, [apiKey]);

  useEffect(() => {
    if (!isValid || !apiKey) return;

    // Initialize Google 3D Tiles Renderer
    const tilesRenderer = new TilesRenderer('https://tile.googleapis.com/v1/3dtiles/root.json');
    tilesRenderer.setCamera(camera);
    tilesRenderer.setResolutionFromRenderer(camera, gl);
    
    // Add Google Cloud Auth Plugin
    tilesRenderer.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey }));
    
    // Add Reorientation Plugin to center the globe at the starting location
    tilesRenderer.registerPlugin(new ReorientationPlugin({
      lat: lat * Math.PI / 180,
      lon: lng * Math.PI / 180,
      up: '+y',
      recenter: true
    }));
    
    scene.add(tilesRenderer.group);
    tilesRendererRef.current = tilesRenderer;

    return () => {
      scene.remove(tilesRenderer.group);
      tilesRenderer.dispose();
      tilesRendererRef.current = null;
    };
  }, [isValid, apiKey, camera, gl, scene, lat, lng]);

  useFrame(() => {
    if (tilesRendererRef.current) {
      tilesRendererRef.current.setCamera(camera);
      tilesRendererRef.current.setResolutionFromRenderer(camera, gl);
      tilesRendererRef.current.update();
    }
  });

  if (error) {
    return (
      <Text position={[0, 2, -5]} fontSize={0.5} color="red" maxWidth={5} textAlign="center">
        {`Map Error:\n${error}\n\nPlease ensure the Map Tiles API is enabled in your Google Cloud Console.`}
      </Text>
    );
  }

  return null;
}
