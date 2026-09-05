import {
  Truck,
  Snowflake,
  Layers,
  Weight,
  Boxes,
  Ship,
  Container,
  Plane,
  PlaneTakeoff,
  Package,
  Train,
} from "lucide-react";

export const TRANSPORT_CATEGORIES = [
  {
    id: "truck",
    name: "Road",
    icon: Truck,
    modes: [
      { id: "53' Dry Van", name: "53' Dry Van", icon: Truck, desc: "Standard road freight (FTL)" },
      { id: "Refrigerated Reefer", name: "Reefer", icon: Snowflake, desc: "Cold-chain (-25°C to +20°C)" },
      { id: "Flatbed / Heavy Haul", name: "Flatbed", icon: Layers, desc: "Oversized & industrial" },
      { id: "Lowboy / RGN Heavy Haul", name: "Lowboy / RGN", icon: Weight, desc: "Heavy equipment & machinery" },
      { id: "Cross-Border LTL", name: "Cross-Border LTL", icon: Boxes, desc: "Partial load, bonded customs P&D" },
    ],
  },
  {
    id: "ship",
    name: "Sea",
    icon: Ship,
    modes: [
      { id: "20ft Container FCL", name: "20ft Container (FCL)", icon: Container, desc: "Full container, up to ~28,000 kg" },
      { id: "40ft Container FCL", name: "40ft Container (FCL)", icon: Container, desc: "Full container, up to ~30,480 kg" },
      { id: "40ft High Cube FCL", name: "40ft High Cube (FCL)", icon: Container, desc: "Extra volume containerized cargo" },
      { id: "Ocean LCL Groupage", name: "LCL / Groupage", icon: Boxes, desc: "Shared container, priced by CBM" },
      { id: "Break Bulk / Heavy Lift", name: "Break Bulk", icon: Weight, desc: "Non-containerized, priced by weight" },
      { id: "RoRo Vehicles & Machinery", name: "RoRo", icon: Ship, desc: "Roll-on / roll-off vehicles & equipment" },
    ],
  },
  {
    id: "plane",
    name: "Air",
    icon: Plane,
    modes: [
      { id: "Air Freight Expedited", name: "Air Expedited", icon: PlaneTakeoff, desc: "Next-Flight-Out express" },
      { id: "Air Freight Standard", name: "Air Standard", icon: Plane, desc: "Economical consolidated airfreight" },
      { id: "Air Charter", name: "Air Charter", icon: Plane, desc: "Dedicated full-aircraft charter" },
      { id: "Courier / Small Parcel", name: "Courier / Parcel", icon: Package, desc: "Documents & small parcels" },
    ],
  },
  {
    id: "rail",
    name: "Rail",
    icon: Train,
    modes: [
      { id: "Intermodal Rail", name: "Intermodal Container", icon: Container, desc: "CN / CPKC cross-country" },
      { id: "Rail Boxcar", name: "Boxcar", icon: Package, desc: "Bulk commodities by rail" },
      { id: "Rail Flatcar Heavy Haul", name: "Flatcar", icon: Weight, desc: "Oversized / heavy rail freight" },
    ],
  },
] as const;

export function findCategoryForMode(modeId: string) {
  return (
    TRANSPORT_CATEGORIES.find((cat) => cat.modes.some((m) => m.id === modeId)) ||
    TRANSPORT_CATEGORIES[0]
  );
}
