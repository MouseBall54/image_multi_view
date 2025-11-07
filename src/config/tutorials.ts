import sampleGif from "../../assets/tutorials/sample-tutorial.gif";

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
    src: sampleGif
  },
  {
    id: "compare-mode",
    title: "Compare Mode Basics",
    description: "Learn how to load folders and compare synchronized viewers.",
    src: sampleGif
  },
  {
    id: "pinpoint-mode",
    title: "Pinpoint Tips",
    description: "Add pins, adjust global scale, and manage pinpoint layouts.",
    src: sampleGif
  }
];
