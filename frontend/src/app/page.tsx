"use client";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import { ArrowUpRight, ArrowRight, MapPin, Car, Menu, Globe } from "lucide-react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { UserButton, useUser, SignInButton } from "@clerk/nextjs";

// --- CONFIG ---
const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
const mapStyle = { width: '100%', height: '100%' };
// Dark Mode Map Style
const mapOptions = {
  disableDefaultUI: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  ]
};
const center = { lat: 40.7580, lng: -73.9855 };

export default function Home() {
  const { isSignedIn, user } = useUser();
  const [step, setStep] = useState(1);
  const [estimate, setEstimate] = useState<any>(null);
  const [status, setStatus] = useState("IDLE");
  
  // Inputs
  const [origin, setOrigin] = useState("Union Square, NY");
  const [dest, setDest] = useState("Central Park, NY");

  // Socket
  useEffect(() => {
    socket.on("ride_status", (data) => setStatus(data.status));
    return () => { socket.off("ride_status"); };
  }, []);

  // --- LOGIC ---
  const handleEstimate = async () => {
    if(!isSignedIn) return alert("Please Login to Search");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rides/estimate?origin=${origin}&dest=${dest}`);
      if (res.ok) {
        const data = await res.json();
        setEstimate(data);
        setStep(2);
      } else {
        // Fallback for demo
        setEstimate({ price: 24.50, duration_min: 18, distance_km: 6.2 });
        setStep(2);
      }
    } catch (e) {
      alert("Backend connection failed");
    }
  };

  const handleBooking = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rides/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: estimate.price,
        user_email: user?.primaryEmailAddress?.emailAddress,
        pickup_lat: 40.7, pickup_lng: -74.0,
        dropoff_lat: 40.8, dropoff_lng: -73.9
      }),
    });
    const data = await res.json();
    if (data.checkout_url) window.location.href = data.checkout_url;
  };

  // --- UI COMPONENTS ---

  return (
    <main className="h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col relative">
      
      {/* 1. MAP BACKGROUND LAYER (Z-0) */}
      <div className="absolute inset-0 z-0 opacity-40">
         <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}>
            <GoogleMap mapContainerStyle={mapStyle} center={center} zoom={13} options={mapOptions}>
              <Marker position={center} />
            </GoogleMap>
         </LoadScript>
         {/* Gradient Overlay for Text Readability */}
         <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent pointer-events-none" />
      </div>

      {/* 2. GRID OVERLAY / LAYOUT (Z-10) */}
      <div className="relative z-10 h-full flex flex-col pointer-events-none">
        
        {/* TOP NAV GRID */}
        <header className="h-20 border-b border-white/10 flex pointer-events-auto bg-[#0a0a0a]/50 backdrop-blur-sm">
          <div className="w-24 border-r border-white/10 flex items-center justify-center">
             <span className="font-bold tracking-widest text-xs text-gray-400">RIDE<br/>QST.</span>
          </div>
          <div className="flex-1 flex items-center justify-between px-8">
             <div className="flex space-x-8 text-xs font-medium tracking-widest text-gray-400">
               <span className="text-white">SERVICES ↗</span>
               <span className="hover:text-white cursor-pointer transition">ABOUT US</span>
               <span className="hover:text-white cursor-pointer transition">CONTACT</span>
             </div>
             
             <div className="flex items-center gap-6">
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold tracking-wide hover:bg-gray-200 transition">
                      LOGIN
                    </button>
                  </SignInButton>
                ) : (
                   <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 hidden sm:block">Hi, {user?.firstName}</span>
                      <UserButton afterSignOutUrl="/" />
                   </div>
                )}
                <Menu className="w-6 h-6 text-white cursor-pointer" />
             </div>
          </div>
        </header>

        {/* MAIN BODY GRID */}
        <div className="flex-1 flex">
          
          {/* LEFT SIDEBAR - BIG VERTICAL TEXT */}
          <div className="w-24 border-r border-white/10 flex items-end justify-center pb-12 pointer-events-auto bg-[#0a0a0a]/30">
             <h1 className="text-7xl font-bold tracking-wider opacity-20 whitespace-nowrap -rotate-90 origin-bottom translate-x-4">
               RIDEQUEST
             </h1>
             <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full border border-white flex items-center justify-center">
               <ArrowRight className="w-4 h-4 rotate-90" />
             </div>
          </div>

          {/* CENTER HERO / BOOKING AREA */}
          <div className="flex-1 border-r border-white/10 relative p-12 flex flex-col justify-center pointer-events-auto">
            
            {/* The "Circle" Visual Element */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/10 pointer-events-none flex items-center justify-center">
               <div className="w-[350px] h-[350px] rounded-full border border-dashed border-white/20 animate-spin-slow"></div>
            </div>

            <div className="relative z-20 max-w-xl">
               {!isSignedIn ? (
                 <>
                   <h2 className="text-5xl font-light leading-tight mb-6">
                     Welcome to the trusted <br/>
                     <span className="font-bold">private transport</span> <br/>
                     service.
                   </h2>
                   <div className="flex items-center gap-4">
                     <SignInButton mode="modal">
                        <button className="h-14 px-8 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:bg-gray-200 transition">
                          Get Started <ArrowUpRight className="w-5 h-5" />
                        </button>
                     </SignInButton>
                   </div>
                 </>
               ) : (
                 // BOOKING FORM (Appears when Logged In)
                 <div className="bg-[#0a0a0a]/90 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
                    {step === 1 && (
                      <div className="space-y-6">
                         <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-gray-500 uppercase">Pickup</label>
                            <div className="flex items-center border-b border-white/20 pb-2">
                               <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                               <input 
                                  value={origin} 
                                  onChange={(e) => setOrigin(e.target.value)}
                                  className="bg-transparent w-full outline-none text-lg font-medium placeholder-gray-600" 
                               />
                            </div>
                         </div>

                         <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-gray-500 uppercase">Dropoff</label>
                            <div className="flex items-center border-b border-white/20 pb-2">
                               <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                               <input 
                                  value={dest} 
                                  onChange={(e) => setDest(e.target.value)}
                                  className="bg-transparent w-full outline-none text-lg font-medium placeholder-gray-600" 
                               />
                            </div>
                         </div>

                         <button onClick={handleEstimate} className="w-full bg-white text-black py-4 rounded-full font-bold tracking-wide mt-4 hover:bg-gray-200 transition flex justify-between px-6 items-center">
                            <span>FIND DRIVER</span>
                            <ArrowRight className="w-5 h-5" />
                         </button>
                      </div>
                    )}

                    {step === 2 && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex justify-between items-end border-b border-white/10 pb-4">
                             <div>
                                <h3 className="text-2xl font-bold">Standard</h3>
                                <p className="text-xs text-gray-400 mt-1">Mercedes-Benz E-Class</p>
                             </div>
                             <div className="text-3xl font-light">${estimate?.price}</div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs tracking-widest text-gray-500">
                             <div className="border border-white/10 p-3 rounded text-center">
                                <span className="block text-white text-lg font-bold mb-1">{estimate?.duration_min}</span>
                                MINUTES
                             </div>
                             <div className="border border-white/10 p-3 rounded text-center">
                                <span className="block text-white text-lg font-bold mb-1">{estimate?.distance_km}</span>
                                KM
                             </div>
                          </div>

                          <button onClick={handleBooking} className="w-full bg-white text-black py-4 rounded-full font-bold tracking-wide mt-2 hover:bg-gray-200 transition">
                            CONFIRM & PAY
                          </button>
                          <button onClick={() => setStep(1)} className="w-full text-xs text-gray-500 py-2 hover:text-white transition">CANCEL</button>
                       </div>
                    )}
                    
                    {step === 3 && (
                       <div className="text-center py-8">
                          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                          <h3 className="text-xl font-bold">Requesting...</h3>
                          <p className="text-sm text-gray-500 mt-2">Connecting to trusted drivers</p>
                       </div>
                    )}
                 </div>
               )}
            </div>
          </div>

          {/* RIGHT SIDEBAR - STATS & INFO */}
          <div className="w-80 hidden lg:flex flex-col pointer-events-auto bg-[#0a0a0a]/80 backdrop-blur-md">
             
             {/* Section 1 */}
             <div className="flex-1 border-b border-white/10 p-8 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-10 top-10 w-40 h-40 border border-dashed border-white/10 rounded-full"></div>
                <h4 className="text-xs text-gray-500 tracking-widest mb-2">MODE</h4>
                <div className="flex items-center gap-3 text-xl font-bold">
                   <div className="bg-white text-black p-2 rounded-full"><Car size={16} /></div>
                   AIR VEHICLE
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Gulfstream G280 / G550</p>
             </div>

             {/* Section 2 */}
             <div className="flex-1 border-b border-white/10 p-8 flex flex-col justify-center">
                <h4 className="text-xs text-gray-500 tracking-widest mb-2">STATUS</h4>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                   <span className="font-bold">47 DRIVERS ONLINE</span>
                </div>
             </div>

             {/* Footer */}
             <div className="p-8">
                <div className="flex gap-2">
                   <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px]">in</div>
                   <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px]">fb</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 border border-white/10 rounded-full px-3 py-1 w-max">
                   <Globe size={10} /> EN
                </div>
             </div>

          </div>

        </div>
      </div>
    </main>
  );
}