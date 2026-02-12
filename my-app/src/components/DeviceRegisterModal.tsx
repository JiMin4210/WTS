import { useMemo, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_REGISTER_DEVICE } from "../queries";
import "./DeviceRegisterModal.css";

export function DeviceRegisterModal(props: {
  open: boolean;
  onClose: () => void;
  onRegistered: (newDeviceId?: string) => Promise<void> | void;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return deviceId.trim() && nickname.trim() && !submitting;
  }, [deviceId, nickname, submitting]);

  async function submit() {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setMsg(null);

      const res = await callAppSync<{ registerDevice: { deviceId: string; nickname: string } }>(
        Q_REGISTER_DEVICE,
        {
          deviceId: deviceId.trim(),
          nickname: nickname.trim(),
        }
      );

      setDeviceId("");
      setNickname("");

      await props.onRegistered(res.registerDevice.deviceId);
    } catch (e: any) {
      const m = String(e?.message ?? e);

      // ✅ 한글 + 존댓말 안내
      if (m.includes("ConditionalCheckFailed") || m.includes("DeviceAlreadyExists")) {
        setMsg("이미 등록된 디바이스 ID입니다. 다른 디바이스 ID를 입력해 주세요.");
      } else {
        setMsg("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!props.open) return null;

  return (
    <div className="modal__backdrop" role="presentation" onMouseDown={props.onClose}>
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="디바이스 등록"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div className="modal__title">디바이스 등록</div>
          <button className="modal__close" type="button" onClick={props.onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="modal__body">
          {/* ✅ 2줄 입력 (요구사항) */}
          <label className="form__label">
            <span>Device ID</span>
            <input
              className="form__input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="예: DEV_TEST_001"
              autoComplete="off"
            />
          </label>

          <label className="form__label">
            <span>닉네임</span>
            <input
              className="form__input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 1호기"
              autoComplete="off"
            />
          </label>

          {msg && <div className="form__msg">{msg}</div>}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" type="button" onClick={props.onClose}>
            취소
          </button>
          <button className="btn btn--primary" type="button" disabled={!canSubmit} onClick={submit}>
            {submitting ? "등록 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
