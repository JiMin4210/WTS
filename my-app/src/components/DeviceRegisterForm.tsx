// src/components/DeviceRegisterForm.tsx
import { useState } from "react";
import { callAppSync } from "../appsync";
import { REGISTER_DEVICE } from "../queries";
import type { DeviceSummary } from "../types";

export function DeviceRegisterForm(props: { onRegistered: () => Promise<void> | void }) {
  const [deviceId, setDeviceId] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function normalizeError(e: any) {
    const raw = (e?.message ?? "").toString();

    const isDup =
      raw.includes("AlreadyExists") ||
      raw.includes("ConditionalCheckFailed") ||
      raw.includes("이미 등록된 디바이스");

    if (isDup) return "이미 등록된 디바이스 ID입니다. 다른 디바이스 ID를 입력해 주세요.";
    if (!raw) return "요청 처리 중 오류가 발생했습니다.";
    return raw.length > 220 ? raw.slice(0, 220) + "..." : raw;
  }

  async function submit() {
    const did = deviceId.trim();
    const name = nickname.trim();

    setOkMsg(null);
    setErrMsg(null);

    if (!did || !name) {
      setErrMsg("디바이스 ID와 닉네임을 모두 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      await callAppSync<{ registerDevice: DeviceSummary }>(REGISTER_DEVICE, {
        deviceId: did,
        nickname: name,
      });

      setOkMsg("등록 완료!");
      setDeviceId("");
      setNickname("");
      await props.onRegistered();
    } catch (e: any) {
      setErrMsg(normalizeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="sb__grid2">
        <input
          className="sb__input"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="deviceId (예: DEV_TEST_001)"
          autoComplete="off"
        />
        <input
          className="sb__input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임 (예: 1호기)"
          autoComplete="off"
        />
      </div>

      <button className="sb__btnPrimary" onClick={submit} disabled={busy}>
        {busy ? "등록 중..." : "등록"}
      </button>

      {okMsg && <div className="sb__msgOk">{okMsg}</div>}
      {errMsg && <div className="sb__msgErr">{errMsg}</div>}
    </div>
  );
}
