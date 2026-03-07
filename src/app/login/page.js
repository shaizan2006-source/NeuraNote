export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Login</h1>

      <input
        type="email"
        placeholder="Email"
        className="border p-2 mt-4"
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2 mt-2"
      />

      <button className="bg-black text-white px-6 py-2 mt-4 rounded">
        Login
      </button>
    </div>
  );
}