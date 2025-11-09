import image_load_layout from "../../assets/tutorials/image_load_layout.gif";
import pinpointLoading from "../../assets/tutorials/pinpoint_loading.gif";
import test2 from "../../assets/tutorials/009.gif";
import test3 from "../../assets/tutorials/010.gif";
import test4 from "../../assets/tutorials/011.gif";
export interface TutorialItem {
  id: string;
  title: string;
  description: string;
  src: string;
}

export const tutorialItems: TutorialItem[] = [
  {
    id: "image-load-layout",
    title: "이미지 로딩 및 레이아웃 조절",
    description: "드래그 앤 드롭으로 이미지를 불러오고, 그리드 선택기로 뷰어 레이아웃을 조절하는 방법을 배워보세요.",
    src: image_load_layout
  },
  {
    id: "pinpoint-loading",
    title: "Pinpoint 모드 이미지 로딩",
    description: "Pinpoint 모드로 이미지를 불러오고, 비교 전 핀을 준비하는 방법을 배웁니다.",
    src: pinpointLoading
  },
  {
    id: "compare-mode",
    title: "Compare 모드 기초",
    description: "여러 폴더를 불러와 동기화된 뷰어에서 이미지를 비교하는 방법을 배웁니다.",
    src: test2
  },
  {
    id: "pinpoint-mode",
    title: "Pinpoint 모드 팁",
    description: "핀 추가, 글로벌 스케일 조정, 레이아웃 관리 등 Pinpoint 모드의 핵심 팁을 확인하세요.",
    src: test3
  }
];
