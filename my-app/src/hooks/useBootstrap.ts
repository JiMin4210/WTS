// src/hooks/useBootstrap.ts
import { useEffect, useRef, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_ME, Q_LIST_MY_DEVICES, Q_REMOVE_DEVICE } from "../queries";
import type { DeviceSummary } from "../types";

/**
 * 앱 최초 부팅 시:
 * 1) me(sub) 가져오기
 * 2) 내 디바이스 목록 가져오기
 * 3) 첫 디바이스 자동 선택(있다면)
 *
 * StrictMode 개발환경에서 useEffect가 2번 도는 현상 방지:
 * - ranOnce 가드로 네트워크 호출 1회만 실행
 */
export function useBootstrap() {
  const [me, setMe] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  //useState: 값이 변하면 컴포넌트가 다시 그려집니다(리렌더링). "이미 실행됨"을 표시하려고 화면을 다시 그릴 필요는 없으므로 비효율적입니다.
  //useRef: 값이 변해도 컴포넌트가 다시 그려지지 않습니다. 오직 값의 보관만이 목적일 때 최적입니다. 
  const ranOnce = useRef(false);

  function safeSetError(e: any) {
    setError(String(e?.message ?? e));
  }

  /**
   * ✅ 디바이스 목록 새로고침
   * - 등록/삭제 후 호출
   * - 선택된 디바이스가 사라졌으면 첫 디바이스로 자동 선택
   */
  async function refreshDevices() {
    const dataList = await callAppSync<{ listMyDevices: DeviceSummary[] }>(Q_LIST_MY_DEVICES);
    const next = dataList.listMyDevices ?? [];
    setDevices(next);

    // ✅ 선택값은 "함수형 업데이트"로 꼬임 방지
    //prev: 현재 선택되어 있는 장치의 ID입니다.
    //next.some(...): 새로 받아온 장치 목록(next) 안에 현재 쓰고 있는 장치(prev)가 여전히 존재하는지 확인합니다.
    //결과: 만약 현재 장치가 목록에 그대로 있다면, 변경하지 않고 기존 값을 그대로 유지(return prev)합니다. (불필요한 상태 변경 방지)
    setSelectedDeviceId((prev) => {
      if (prev && next.some((d) => d.deviceId === prev)) return prev;
      return next.length ? next[0].deviceId : null;
    });
  }

  /**
   * ✅ 디바이스 삭제
   * - 내 userId 파티션에서만 삭제됨(DynamoDB PK=userId 기반)
   * - 삭제 후 목록 갱신
   */
  async function removeDevice(deviceId: string) {
    // ✅ UX: 삭제는 반드시 확인(실수 방지)
    const ok = window.confirm("정말로 이 디바이스를 삭제할까요?\n(삭제 후에는 목록에서 제거됩니다)");
    if (!ok) return;

    await callAppSync<{ removeDevice: boolean }>(Q_REMOVE_DEVICE, { deviceId });
    await refreshDevices();
  }

  //React 컴포넌트는 데이터가 바뀔 때마다 함수 자체가 반복해서 실행(리렌더링)됩니다. 그런데 "화면은 그려지되, 특정 로직(예: API 호출)은 딱 한 번만 혹은 특정 상황에서만 실행"하고 싶을 때 useEffect를 사용합니다.
  //두 번째 인자인 배열 []이 비어 있으면, 컴포넌트가 화면에 처음 나타날 때(마운트) 딱 한 번만 실행됩니다.
  //하지만 React 18의 특성상 실제로는 두 번 실행될 수 있는데, 이를 방지하기 위해 앞서 질문하신 ranOnce 변수를 사용하고 있는 것입니다.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    // 2. 비동기 작업 시작 (즉시 실행 함수 패턴)
    (async () => {
      try {
        setError(null);

        // 3. 내 정보 가져오기 (API 호출)
        const dataMe = await callAppSync<{ me: string }>(Q_ME);
        // 가져온 내 정보를 상태에 저장
        setMe(dataMe.me);

        // 4. 연결된 디바이스 목록 새로고침
        await refreshDevices();
      } catch (e: any) {
        // 5. 에러 발생 시 처리
        safeSetError(e);
        setMe(null); // 정보 초기화
        setDevices([]); // 장치 목록 비우기
        setSelectedDeviceId(null); // 선택된 장치 해제
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] 이므로 컴포넌트가 켜질 때 딱 한 번 실행 시도

  return {
    me,
    isLoggedIn: me !== null,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    error,
    setError,

    // ✅ 추가 exports
    refreshDevices,
    removeDevice,
  };
}
