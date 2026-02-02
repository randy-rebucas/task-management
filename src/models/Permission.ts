import mongoose, { Schema, Model } from "mongoose";
import { IPermission } from "@/types";

const PermissionSchema = new Schema<IPermission>(
  {
    resource: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    group: { type: String, required: true },
  },
  { timestamps: true }
);

PermissionSchema.index({ resource: 1, action: 1 }, { unique: true });

const Permission: Model<IPermission> =
  mongoose.models.Permission || mongoose.model<IPermission>("Permission", PermissionSchema);

export default Permission;
