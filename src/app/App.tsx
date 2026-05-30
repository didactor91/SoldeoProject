// src/app/App.tsx — Root application component, routes between setup/welding/heatmap screens
// Default export (R3F convention)
// Rules: A-06 (types from store), A-02 (single responsibility)

import { useWelderStore } from './store';
import SetupScreen from '../ui/screens/SetupScreen';
import WeldingScreen from '../ui/screens/WeldingScreen';
import HeatmapScreen from '../ui/screens/HeatmapScreen';

/**
 * App — Root component that routes between the three main screens.
 *
 * Phase flow: setup → welding → heatmap → setup (via reset)
 *
 * Reads session.phase from store to determine which screen to render.
 * This is the only component that knows about all three screens.
 */
function App() {
  const phase = useWelderStore(s => s.session.phase);

  switch (phase) {
    case 'setup':
      return <SetupScreen />;
    case 'welding':
      return <WeldingScreen />;
    case 'heatmap':
      return <HeatmapScreen />;
    default:
      // Fallback to setup for unknown phases
      return <SetupScreen />;
  }
}

export default App;
