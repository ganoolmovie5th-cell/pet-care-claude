export default function Login() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Vet Dashboard Login</h1>
      <form>
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
      <p>Placeholder - TBD in Task 4</p>
    </div>
  );
}
