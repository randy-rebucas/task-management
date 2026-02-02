import mongoose, { Schema, Model } from "mongoose";
import { IDepartment } from "@/types";

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    head: { type: Schema.Types.ObjectId, ref: "User" },
    parentDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ code: 1 });
DepartmentSchema.index({ isActive: 1 });

const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
