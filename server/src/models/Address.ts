import { Schema } from 'mongoose';
import { IAddress } from '@kumorpara/shared';

export const AddressSchema = new Schema<IAddress>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, trim: true }, // 2-digit Indian State code e.g. "19", "27"
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);
