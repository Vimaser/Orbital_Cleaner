const TRAINING_SECTIONS = [
  {
    id: "controls",
    title: "CONTROLS / INPUT MAP",
    description: [
      "CONTROLS",
      "",
      "Keyboard",
      "",
      "  W/S                 Pitch / vertical control",
      "  A/D                 Turn left/right",
      "  Arrow Up/Down       Throttle up/down",
      "  Shift               Boost",
      "  Enter               Confirm / interact",
      "  Esc                 Back / pause",
      "  M                   Tracker mode",
      "  T                   Emergency tow",
      "  ` / ~               Ship menu",
      "",
      "Controller",
      "",
      "  Left Stick          Ship control / directional movement",
      "  Right Stick Up/Down Throttle up/down",
      "  D-Pad Left/Right    Menu/training horizontal navigation",
      "  D-Pad Up/Down       Throttle up/down",
      "  Y / Triangle        Tracker mode",
      "  X / Square          Emergency tow",
      "  A / Cross           Confirm / interact",
      "  B / Circle          Back / cancel",
      "  Select/View/Share   Ship menu",
      "  Start               Pause",
      "  LB / RB / RT        Boost",
    ].join("\n"),
    video: "/assets/training/controls.webm",
  },
  {
    id: "repair",
    title: "SATELLITE REPAIR",
    description:
      "Match alignment rings and hold steady to complete repairs.",
    video: "/assets/training/repair.webm",
  },
  {
    id: "debris",
    title: "DEBRIS CLEANUP",
    description:
      "Capture and burn debris for payout. Larger debris requires more control. But have larger payouts",
    video: "/assets/training/debris.webm",
  },
  {
    id: "tracker",
    title: "ORBITAL TRACKER",
    description: "Use the tracker to locate satellites and debris. Press M to switch tracker modes (gamepad Y / Triangle).",
    video: "/assets/training/tracker.webm",
  },
  {
    id: "kessler",
    title: "KESSLER EFFECT",
    description:
      "High instability increases debris and operating costs. Repairing satellites helps stabilize orbit and reduce Kessler buildup.",
    video: "/assets/training/kessler.webm",
  },
  {
    id: "fuel",
    title: "FUEL & DOCKING",
    description:
      "Fuel drains during your shift, and boost burns it faster. If fuel hits zero, low power mode activates. Limp back to the ISS for a reduced maintenance fee, or request a full emergency tow with T / X / Square.",
    video: "/assets/training/fuel.webm",
  },
  {
    id: "movement",
    title: "BOOST & ORBITAL MOVEMENT",
    description:
      "Use boost to close distance quickly, then stabilize for precise alignment. Smooth turns and short bursts keep you fast without wasting fuel.",
    video: "/assets/training/movement.webm",
  },
];

export function createTrainingMenu() {
  let activeIndex = 0;

  function getActiveSection() {
    return TRAINING_SECTIONS[activeIndex];
  }

  function next() {
    activeIndex = (activeIndex + 1) % TRAINING_SECTIONS.length;
  }

  function prev() {
    activeIndex =
      (activeIndex - 1 + TRAINING_SECTIONS.length) % TRAINING_SECTIONS.length;
  }

  function setActiveSection(sectionId) {
    const nextIndex = TRAINING_SECTIONS.findIndex(
      section => section.id === sectionId,
    );

    if (nextIndex >= 0) {
      activeIndex = nextIndex;
    }
  }

  function getSections() {
    return TRAINING_SECTIONS.map(section => ({ ...section }));
  }

  function render() {
    const section = getActiveSection();

    return {
      title: "ORBITAL TRAINING",
      subtitle: "Quick reference for current shift operations",
      sectionTitle: section.title,
      description: section.description,
      video: section.video,
      activeSectionId: section.id,
      sections: getSections(),
      footer: "LEFT / RIGHT (ARROWS / STICK): CHANGE TOPIC   ENTER / A: SELECT   ESC / B: BACK",
    };
  }

  return {
    next,
    prev,
    setActiveSection,
    getActiveSection,
    getSections,
    render,
  };
}