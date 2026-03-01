import * as THREE from 'three';

const R = 6378137; // Earth radius in meters

export function latLngToVector3(centerLat: number, centerLng: number, targetLat: number, targetLng: number) {
  const dLat = (targetLat - centerLat) * Math.PI / 180;
  const dLng = (targetLng - centerLng) * Math.PI / 180;
  
  const z = -dLat * R; // North is -Z
  const x = dLng * R * Math.cos(centerLat * Math.PI / 180); // East is +X
  
  return new THREE.Vector3(x, 0, z);
}

export function vector3ToLatLng(centerLat: number, centerLng: number, offset: THREE.Vector3) {
  const dLat = -offset.z / R;
  const dLng = offset.x / (R * Math.cos(centerLat * Math.PI / 180));
  
  return {
    lat: centerLat + (dLat * 180 / Math.PI),
    lng: centerLng + (dLng * 180 / Math.PI)
  };
}

export function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}
