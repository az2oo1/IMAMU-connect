import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Layers, Box } from 'lucide-react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CLASSROOMS = [
  { id: '1', name: 'Lab 101', building: 'College of Computer and Information Sciences', floor: 1, lat: 24.8150, lng: 46.6240 },
  { id: '2', name: 'Lecture Hall A', building: 'College of Engineering', floor: 1, lat: 24.8130, lng: 46.6220 },
  { id: '3', name: 'Reading Room 3', building: 'Central Library', floor: 3, lat: 24.8144, lng: 46.6250 },
  { id: '4', name: 'Room 402', building: 'College of Science', floor: 4, lat: 24.8160, lng: 46.6260 },
];

export default function MapTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<typeof CLASSROOMS[0] | null>(null);
  const [show3DModal, setShow3DModal] = useState(false);

  const filteredRooms = CLASSROOMS.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.building.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col md:flex-row h-full relative"
    >
      {/* Sidebar / Search */}
      <div className="w-full md:w-80 bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800 flex flex-col z-10">
        <div className="p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold mb-3">Campus Map</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search classrooms (e.g. Room 402)" 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredRooms.map((room, index) => (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={clsx(
                "w-full text-left p-3 rounded-xl transition-all duration-200 mb-1 flex items-start gap-3",
                selectedRoom?.id === room.id 
                  ? "bg-primary-500/10 border border-primary-500/20" 
                  : "hover:bg-neutral-800/50 border border-transparent"
              )}
            >
              <div className={clsx(
                "mt-0.5 p-1.5 rounded-lg transition-colors",
                selectedRoom?.id === room.id ? "bg-primary-500/20 text-primary-400" : "bg-neutral-800 text-neutral-400"
              )}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className={clsx(
                  "font-medium text-sm transition-colors",
                  selectedRoom?.id === room.id ? "text-primary-100" : "text-neutral-200"
                )}>{room.name}</div>
                <div className="text-xs text-neutral-500">{room.building} • Floor {room.floor}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-neutral-800 z-0 h-[50vh] md:h-auto">
        <MapContainer 
          center={[24.8144, 46.6239]} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {filteredRooms.map(room => (
            <Marker key={room.id} position={[room.lat, room.lng]}>
              <Popup className="custom-popup">
                <div className="p-1">
                  <h3 className="font-bold text-neutral-900">{room.name}</h3>
                  <p className="text-sm text-neutral-600 mb-2">{room.building}</p>
                  <button 
                    onClick={() => setShow3DModal(true)}
                    className="w-full bg-primary-600 text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 hover:bg-primary-500 transition-colors"
                  >
                    <Box className="w-3 h-3" /> View in 3D
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 3D Modal Mockup */}
      <AnimatePresence>
        {show3DModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setShow3DModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
                <h3 className="font-semibold flex items-center gap-2 text-white">
                  <Box className="w-5 h-5 text-primary-400" />
                  3D View: {selectedRoom?.name || 'Room'}
                </h3>
                <button onClick={() => setShow3DModal(false)} className="text-neutral-400 hover:text-white hover:bg-neutral-800 p-1 rounded-lg transition-colors">
                  ✕
                </button>
              </div>
              <div className="aspect-video bg-neutral-950 relative flex items-center justify-center">
                <img 
                  src="https://picsum.photos/seed/classroom3d/800/450" 
                  alt="3D Render" 
                  className="w-full h-full object-cover opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Box className="w-12 h-12 text-white/50 mb-2 animate-pulse" />
                  <p className="text-white/70 text-sm font-medium">Interactive 3D Canvas (Three.js)</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
