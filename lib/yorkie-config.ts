/**
 * Yorkie 서버는 항상 웹앱과 같은 호스트의 8080 포트에서 돈다. 접속한 주소
 * (window.location)에서 호스트를 그대로 가져오므로, 와이파이가 바뀌어 IP가
 * 달라져도 .env.local을 고칠 필요가 없다.
 *
 * NEXT_PUBLIC_YORKIE_RPC_ADDR가 설정돼 있으면 그 값을 우선 사용한다(예: Yorkie를
 * 다른 머신에서 돌릴 때의 수동 오버라이드).
 */
const YORKIE_PORT = 8080;

export function getYorkieRpcAddr(): string {
  const override = process.env.NEXT_PUBLIC_YORKIE_RPC_ADDR;
  if (override) return override;

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${YORKIE_PORT}`;
  }

  // SSR 폴백 — 이 Provider들은 ssr:false라 보통 여기에 도달하지 않는다.
  return `http://localhost:${YORKIE_PORT}`;
}
