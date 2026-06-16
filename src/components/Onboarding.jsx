// src/components/Onboarding.jsx

export default function Onboarding({ onDismiss }) {
  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to VisionGuide"
    >
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome to VisionGuide</h2>
        <p style={styles.body}>
          VisionGuide listens to your camera and speaks directions to help you navigate indoors.
        </p>
        <ol style={styles.steps}>
          <li>Type or speak where you want to go</li>
          <li>Tap Start Navigation</li>
          <li>Hold your phone in front of you at chest height</li>
          <li>Follow the spoken directions</li>
        </ol>
        <div style={styles.warning}>
          Keep using your white cane or mobility aid at all times.
        </div>
        <button
          onClick={onDismiss}
          autoFocus
          style={styles.button}
          aria-label="Got it, start using VisionGuide"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '24px',
  },
  card: {
    background: '#1a1a1a',
    borderRadius: '12px',
    padding: '28px 24px',
    maxWidth: '400px',
    width: '100%',
    border: '1px solid #333',
  },
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '12px',
  },
  body: {
    color: '#aaa',
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  steps: {
    color: '#ffffff',
    fontSize: '16px',
    lineHeight: '2',
    paddingLeft: '20px',
    marginBottom: '20px',
  },
  warning: {
    background: '#2a1500',
    border: '1px solid #b84c00',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#f97316',
    fontSize: '14px',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  button: {
    width: '100%',
    minHeight: '56px',
    background: '#1a4fd6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
  },
};
