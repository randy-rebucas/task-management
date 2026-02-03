import mongoose, { Schema, Model } from "mongoose";

export interface IAppSetting {
  key: string;
  value: any;
}

const AppSettingSchema = new Schema<IAppSetting>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
});

const AppSetting: Model<IAppSetting> =
  mongoose.models.AppSetting || mongoose.model<IAppSetting>("AppSetting", AppSettingSchema);

export default AppSetting;
