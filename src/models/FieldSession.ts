import mongoose, { Schema, Model } from "mongoose";
import { IFieldSession } from "@/types";

const LocationSchema = new Schema(
  { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const RoutePointSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FieldSessionSchema = new Schema<IFieldSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    date: { type: Date, required: true, index: true },
    checkIn: {
      time: { type: Date, required: true },
      location: { type: LocationSchema, required: true },
      address: { type: String },
      photo: { type: String },
    },
    checkOut: {
      time: { type: Date },
      location: { type: LocationSchema },
      photo: { type: String },
    },
    duration: { type: Number, min: 0 },
    routePoints: { type: [RoutePointSchema], default: [] },
    notes: { type: String },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

FieldSessionSchema.index({ user: 1, date: -1 });
FieldSessionSchema.index({ status: 1 });
FieldSessionSchema.index({ "checkIn.location.lat": 1, "checkIn.location.lng": 1 });

const FieldSession: Model<IFieldSession> =
  mongoose.models.FieldSession ||
  mongoose.model<IFieldSession>("FieldSession", FieldSessionSchema);

export default FieldSession;
