import '@xyflow/react/dist/style.css';
import { CodeDiagramWorkbench, useTheme } from '@flowconsole/web';
import styles from './App.module.css';

export default function App() {
  const { resolvedScheme, scheme, toggleScheme } = useTheme();

  return (
    <div className={styles.root}>
      <div className={styles.workbench}>
        <CodeDiagramWorkbench
          apiBaseUrl={import.meta.env.VITE_FLOWCONSOLE_API_URL}
          themeControls={{ resolvedScheme, scheme, toggleScheme }}
        />
      </div>
    </div>
  );
}
