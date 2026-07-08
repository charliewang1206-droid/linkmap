import { useEffect } from 'react';
import { usePersonStore } from './stores/usePersonStore';
import { useRelationStore } from './stores/useRelationStore';
import { useViewStore } from './stores/useViewStore';
import { useCircleStore } from './stores/useCircleStore';
import AppShell from './components/AppShell';

export default function App() {
  const loadPersons = usePersonStore((s) => s.loadPersons);
  const loadRelations = useRelationStore((s) => s.loadRelations);
  const loadViews = useViewStore((s) => s.loadViews);
  const loadCircles = useCircleStore((s) => s.loadCircles);

  useEffect(() => {
    loadPersons();
    loadRelations();
    loadViews();
    loadCircles();
  }, [loadPersons, loadRelations, loadViews, loadCircles]);

  return <AppShell />;
}
