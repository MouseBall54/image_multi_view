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
    title: "Image Loading & Layout",
    description: "Learn to load images via drag-and-drop and adjust the layout with the grid selector.",
    src: image_load_layout
  },
  {
    id: "pinpoint-loading",
    title: "Pinpoint Image Loading",
    description: "Load an image into Pinpoint mode and prepare pins before comparing.",
    src: pinpointLoading
  },
  {
    id: "compare-mode",
    title: "Compare Mode Basics",
    description: "Learn how to load folders and compare images in synchronized viewers.",
    src: test2
  },
  {
    id: "pinpoint-mode",
    title: "Pinpoint Tips",
    description: "Discover key tips for Pinpoint mode, including adding pins, adjusting global scale, and managing layouts.",
    src: test3
  }
];
