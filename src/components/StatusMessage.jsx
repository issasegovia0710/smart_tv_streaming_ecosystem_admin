export default function StatusMessage({ error, success }) {
  if (!error && !success) return null;

  return (
    <div className={`status-message ${error ? 'error' : 'success'}`}>
      {error || success}
    </div>
  );
}
