---
layout: post
title: "VMware Clone을 이용한 rocky9.4 복제 및 스냅샷 설정"
date: 2026-05-07 01:00:00 +0900
category: lab
permalink: /lab/vmware-clone/
---
이번 실습에서는 VMware Workstation에서 기존 가상머신을 복제한 뒤, 복제한 가상머신의 IP 주소와 호스트명을 변경하고 스냅샷을 생성하는 과정을 진행하였다.<br>
실습에 사용한 원본 가상머신은 Rocky9-tem이며, 이를 복제하여 Rocky9-1, Rocky9-2, Rocky9-3 가상머신을 생성하였다.

---

### 1. VMware Clone을 이용한 가상 머신 복제

- 복제할 원본 가상머신 선택 <br>
![이미지](/assets/images/clone_snapshot/clone1.png) <br>
먼저 복제할 원본 가상 머신을 선택하고 우크릭한 후 `manage → Clone` 메뉴로 이동한다.

<br>

- Clone 마법사 <br>
![이미지](/assets/images/clone_snapshot/clone2.png) <br>
Clone Virtual Machine Wizard가 실행되고 다음 버튼을 클릭하여 진행한다.

<br>

### 2. Clone Source 선택
![이미지](/assets/images/clone_snapshot/clone3.png) <br>
현재 가상 머신의 상태를 기준으로 복제하기 위해 `The current state in the virtual machine`으로 선택해주고 다음 버튼을 클릭한다.

<br>

### 3. Clone Type 선택
![이미지](/assets/images/clone_snapshot/clone4.png) <br>
원본 가상머신과 독립적인 완전한 복사본을 생성하기 위해 `Create a full clone`을 선택하고 다음 버튼을 클릭한다.

<br>

### 4. 복제 가상 머신 이름 및 저장 위치 설정
![이미지](/assets/images/clone_snapshot/clone5.png) <br>
![이미지](/assets/images/clone_snapshot/clone6.png) <br>
복제 가상 머신 이름을 `Rocky9-1`로 정하고 원하는 저장 위치를 설정한 후 마침 버튼을 클릭하면 복제가 시작된다.

<br>

### 5. 가상머신 복제 진행 및 완료
![이미지](/assets/images/clone_snapshot/clone7.png) <br>
![이미지](/assets/images/clone_snapshot/clone8.png) <br>
복제가 완료되면 Close 버튼을 클릭하여 마법사를 종료한다. <br>
이 과정을 반복하여 `Rocky9-2`와 `Rocky9-3` 가상 머신을 추가로 생성하였다.

<br>

### 6. 호스트명 변경
가상 머신을 복제하면 기본 설정이 원본과 동일하게 복사된다. 따라서 복제한 가상 머신들은 각각 다른 호스트명을 사용하도록 변경해야 한다.<br>

- 현재 호스트명 확인 <br>
![이미지](/assets/images/clone_snapshot/ipconf10.png) <br>


<br>

- 호스트명 변경 및 변경된 호스트명 확인 <br>
![이미지](/assets/images/clone_snapshot/ipconf11.png) <br>

<br>

### 7. 복제한 가상 IP 주소 설정
IP 주소도 호스트명과 같이 가상 머신을 복제하면 동일하게 복사되기 때문에 변경해준다.  <br>

- 현재 네트워크 인터페이스 정보 확인 <br>
![이미지](/assets/images/clone_snapshot/ipconf1.png) <br>

- 네트워크 설정 <br>
![이미지](/assets/images/clone_snapshot/ipconf2.png) <br>
![이미지](/assets/images/clone_snapshot/ipconf3.png)
![이미지](/assets/images/clone_snapshot/ipconf4.png) <br>
![이미지](/assets/images/clone_snapshot/ipconf5.png) <br>
![이미지](/assets/images/clone_snapshot/ipconf6.png) <br>
![이미지](/assets/images/clone_snapshot/ipconf7.png)
![이미지](/assets/images/clone_snapshot/ipconf8.png) <br>
네트워크를 변경 후 변경된 내용으로 활성화해주기 위해 Deactivate를 누른 후 다시 Activate를 눌러준다.

<br>

- 변경된 네트워크 인터페이스 정보 확인 <br>
![이미지](/assets/images/clone_snapshot/ipconf9.png) <br>

<br>

- 재부팅 후 설정 확인 <br>
![이미지](/assets/images/clone_snapshot/ipconf12.png) <br>

<br>

- 복제한 가상 머신들의 IP 주소 <br>

    | 구분 | Rocky9-1 | Rocky9-2 | Rocky9-3 |
    |---|---|---|---|
    | IP Address | 10.0.0.11 | 10.0.0.12 | 10.0.0.13 |
    | Subnet Mask | 255.255.255.0 | 255.255.255.0 | 255.255.255.0 |
    | Gateway | 10.0.0.254 | 10.0.0.254 | 10.0.0.254 |
    | DNS | 168.126.63.1, 8.8.8.8 | 168.126.63.1, 8.8.8.8 | 168.126.63.1, 8.8.8.8 |

<br>

### 8. 스냅샷 생성
가상 머신 설정이 완료되면 현재 상태를 저장하기 위해 스냅샷을 생성한다. <br>

- 스냅샷을 찍을 원본 가상머신 선택 <br>
![이미지](/assets/images/clone_snapshot/snapshot1.png) <br>
스냅샷을 찍을 원본 가상 머신을 선택하고 우크릭한 후 `Snapshot → Take Snapshot` 메뉴로 이동한다. <br>

<br>
- Take Snapshot 창 <br>
![이미지](/assets/images/clone_snapshot/snapshot2.png) <br>
원하는 스냅샷 이름을 입력하고 `Take Snapshot` 버튼을 클릭한다.