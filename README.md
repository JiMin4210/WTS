# 📦 생산량 모니터링 시스템 (WTS)

전국 각지의 생산 설비(ESP32 기반)에서 발생하는 생산량 데이터를  
안정적으로 수집·집계하여 웹 대시보드로 제공하는 시스템입니다.

> **설계 핵심**  
> 실시간성보다 **신뢰성 · 운영 안정성 · 비용 효율**을 우선합니다.

---

## 🚀 v1.0 요약 (Initial Release)

- 생산량 **모니터링 1차 배포 버전**
- 누적 카운터(total) 기반 데이터 수집
- 사용자별 디바이스 완전 분리
- 운영자 전용 페이지(`/admin`) 제공
- 수동 새로고침 기반 데이터 확인 (폴링 없음)
  
---

<details>
<summary><strong>📘 v1.0 전체 설명 펼치기</strong></summary>

<br/>

## 1. 시스템 개요

본 시스템은 전국에 분산된 생산 설비로부터  
생산량 데이터를 수집·집계하여  
사용자 및 운영자가 생산 현황을 명확히 파악할 수 있도록 설계되었습니다.

### 설계 방향
- 데이터 유실/왜곡 방지
- 운영자가 “왜 값이 안 들어왔는지” 설명 가능
- 불필요한 실시간 통신 제거

---

## 2. 전체 아키텍처

[ESP32 / Python Simulator]
        |
        | MQTT (total counter)
        v
[AWS IoT Core]
        |
        | IoT Rule
        v
[AWS Lambda]
  - delta 계산
  - 오버플로우 방어
        |
        v
[DynamoDB]
  - device_ts
  - device_agg
  - device_last
        |
        v
[AWS AppSync]
        |
        v
[Web App (React)]
  - 사용자 페이지
  - 운영자 페이지 (/admin)

---

## 3. 데이터 저장 구조

- device_ts : 시간 단위 생산량
- device_agg : 일/월 집계
- device_last : 디바이스 최종 상태

---

</details>
