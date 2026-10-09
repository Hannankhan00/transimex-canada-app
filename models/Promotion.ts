import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPromoImage {
  url: string;
  width: number;
  height: number;
  bytes?: number;
  originalBytes?: number;
  mediaId?: string;
}

export interface IPromoText {
  title: string;
  description: string;
  badge: string;
  ctaLabel: string;
  footer: string;
  imageAlt: string;
}

export interface IPromoPlace {
  label: string;
  countryCode: string;
}

export interface IPromotion extends Document {
  name: string;
  isActive: boolean;
  priority: number;
  delaySeconds: number;
  startsAt: Date | null;
  endsAt: Date | null;
  departureDate: string | null;
  destination: { city: string; countryCode: string };
  ports: IPromoPlace[];
  showFlags: boolean;
  cta: { url: string };
  image: { en: IPromoImage | null; fr: IPromoImage | null };
  content: { en: IPromoText; fr: IPromoText };
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<IPromoImage>(
  {
    url: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number },
    originalBytes: { type: Number },
    mediaId: { type: String },
  },
  { _id: false }
);

const TextSchema = new Schema<IPromoText>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    badge: { type: String, default: "" },
    ctaLabel: { type: String, required: true },
    footer: { type: String, default: "" },
    imageAlt: { type: String, default: "" },
  },
  { _id: false }
);

const PlaceSchema = new Schema<IPromoPlace>(
  {
    label: { type: String, required: true },
    countryCode: { type: String, default: "" },
  },
  { _id: false }
);

const PromotionSchema = new Schema<IPromotion>(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    priority: { type: Number, default: 1 },
    delaySeconds: { type: Number, default: 5 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    departureDate: { type: String, default: null },
    destination: {
      city: { type: String, default: "" },
      countryCode: { type: String, default: "" },
    },
    ports: { type: [PlaceSchema], default: [] },
    showFlags: { type: Boolean, default: true },
    cta: { url: { type: String, required: true } },
    image: {
      en: { type: ImageSchema, default: null },
      fr: { type: ImageSchema, default: null },
    },
    content: {
      en: { type: TextSchema, required: true },
      fr: { type: TextSchema, required: true },
    },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

// The public endpoint always filters on these together.
PromotionSchema.index({ isActive: 1, priority: 1 });

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion || mongoose.model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;
