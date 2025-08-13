import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SearchProvider } from './contexts/SearchContext';
import ReownProvider from './providers/ReownProvider';

import Header from './components/Header';
import Footer from './components/Footer';
import BackgroundCircles from './components/BackgroundCircles';
import LoadingScreen from './components/LoadingScreen';
// import DevPanel from './components/DevPanel';
// import MemoryMonitor from './components/MemoryMonitor';
import WalletStatusMonitor from './components/WalletStatusMonitor';
import DebugLoader from './components/DebugLoader';
import TestPage from './components/TestPage';
import SimpleTestPage from './components/SimpleTestPage';
import ReownTest from './components/ReownTest';
// import PreloadStatus from './components/PreloadStatus';

import Home from './pages/Home';
import Explore from './pages/Explore';
import CreateNFTs from './pages/CreateNFTs';
import CreateDreams from './pages/CreateDreams';
import Launchpad from './pages/Launchpad';
import Marketplace from './pages/Marketplace';
import JsonUploadPage from './pages/JsonUploadPage';
import MyStudio from './pages/MyStudio';
import ActiveSales from './pages/ActiveSales';
import ManageCollection from './pages/ManageCollection';
import PhaseSettingsWrapper from './pages/PhaseSettingsWrapper';
import ManageWLs from './pages/ManageWLs';
import ManageNFTs from './pages/ManageNFTs';
import CollectionMintPage from './pages/CollectionMintPage';
import MyNFTs from './components/MyNFTs';
import SomniaQuest from './pages/SomniaQuest';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

import portalVideo from './assets/videos/IMG_6919.MOV';
import portalHoverVideo from './assets/videos/IMG_6924.MOV';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedBefore, setHasLoadedBefore] = useState(false);

  // Проверяем, загружался ли сайт ранее в этой сессии
  useEffect(() => {
    const hasLoaded = sessionStorage.getItem('dreava_loaded');
    if (hasLoaded) {
      setIsLoading(false);
      setHasLoadedBefore(true);
    }
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setHasLoadedBefore(true);
    // Сохраняем флаг в sessionStorage, чтобы не показывать загрузку при навигации
    sessionStorage.setItem('dreava_loaded', 'true');
  };

  return (
    <ReownProvider>
      <SearchProvider>
        <Router>
            <div className="flex flex-col min-h-screen bg-black text-white relative overflow-x-hidden">
            {/* Экран загрузки показывается только при первой загрузке */}
            {isLoading && !hasLoadedBefore && (
              <LoadingScreen onLoadingComplete={handleLoadingComplete} />
            )}
            
            <BackgroundCircles />
            <Header />
            {/* <DevPanel /> */}
            {/* <MemoryMonitor 
              enabled={localStorage.getItem('showMemoryMonitor') === 'true'}
              criticalThreshold={80}
              warningThreshold={60}
              onCritical={(info) => {
                console.error('🚨 CRITICAL MEMORY:', info);
                // Можно добавить уведомление пользователю
              }}
            /> */}
            <WalletStatusMonitor 
              enabled={localStorage.getItem('showWalletMonitor') === 'true'}
            />
            <DebugLoader 
              enabled={localStorage.getItem('showDebugLoader') === 'true'}
            />
            
            <div className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/create-nfts" element={<CreateNFTs />} />
                <Route path="/create-dreams" element={<CreateDreams />} />
                <Route path="/launchpad" element={<Launchpad />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/json-upload" element={<JsonUploadPage />} />
                <Route path="/dashboard" element={<MyStudio />} />
                <Route
                  path="/launchpad/active-sales"
                  element={<ActiveSales portalVideo={portalVideo} portalHoverVideo={portalHoverVideo} showBaseVideoAlways={true} />}
                />
                <Route
                  path="/active-sales"
                  element={<ActiveSales portalVideo={portalVideo} portalHoverVideo={portalHoverVideo} showBaseVideoAlways={true} />}
                />
                <Route path="/manage/:address" element={<ManageCollection />} />
                <Route path="/edit-phases/:address" element={<PhaseSettingsWrapper />} />
                <Route path="/manage-wls/:address" element={<ManageWLs />} />
                <Route path="/edit-nfts/:address" element={<ManageNFTs />} />
                <Route path="/launchpad/collection/:address" element={<CollectionMintPage />} />
                <Route path="/my-nfts" element={<MyNFTs />} />
                <Route path="/somnia-quest" element={<SomniaQuest />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/test" element={<TestPage />} />
                <Route path="/simple" element={<SimpleTestPage />} />
                <Route path="/reown-test" element={<ReownTest />} />
              </Routes>
            </div>
            <Footer />
            </div>
          </Router>
        </SearchProvider>
      </ReownProvider>
  );
}

export default App;
