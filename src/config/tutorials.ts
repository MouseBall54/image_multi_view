import sampleGif from "../../assets/tutorials/sample-tutorial.gif";
import test1 from "../../assets/tutorials/008.gif";
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
    id: "getting-started",
    title: "Quick Start",
    description: "Overview of the workspace layout and basic navigation.",
    src: test1
  },
  {
    id: "compare-mode",
    title: "Compare Mode Basics",
    description: "Learn how to load folders and compare synchronized viewers.",
    src: test2
  },
  {
    id: "pinpoint-mode",
    title: "Pinpoint Tips",
    description: "Add pins, adjust global scale, and manage pinpoint layouts.",
    src: test3
  },
  {
    id: "Test-Tip",
    title: "Test Tips",
    description: "Add pins, adjust global scale, and manage pinpoint layouts.",
    src: test4
  }
];
