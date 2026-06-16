// src/components/StartStopButton.jsx

export default function StartStopButton({ status, onStart, onStop, disabled }) {
  const isNavigating = status === 'navigating';
  const isListening = status === 'listening';
  const isArrived = status === 'arrived';

  const label = isNavigating
    ? 'Stop'
    : isListening
    ? 'Listening...'
    : isArrived
    ? 'Start Again'
    : 'Start Navigation';

  const handleClick = isNavigating ? onStop : onStart;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isListening}
      aria-label={label}
      style={{
        ...styles.button,
        background: isNavigating ? '#7a0000' : '#1a4fd6',
        opacity: (disabled || isListening) ? 0.4 : 1,
        cursor: (disabled || isListening) ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const styles = {
  button: {
    width: '100%',
    minHeight: '64px',
    borderRadius: '10px',
    border: 'none',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
    transition: 'background 0.15s',
  },
};
