export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < 12; i++) {
    senha += chars[Math.floor(Math.random() * chars.length)];
  }
  return senha;
}
