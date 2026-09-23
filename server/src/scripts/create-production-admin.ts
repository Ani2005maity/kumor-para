import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return '***masked-uri***';
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function createProductionAdmin() {
  const mongoUri = process.env.MONGODB_URI;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || 'Platform Admin';
  const adminPhone = process.env.ADMIN_PHONE?.trim() || '+919876543210';

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI environment variable is required.');
    console.error('Please provide MONGODB_URI when executing this script.');
    process.exit(1);
  }

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error('Usage: ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="your-password" npm run create:production-admin');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 8 characters long for production security.');
    process.exit(1);
  }

  console.log(`📡 Connecting to database: ${sanitizeMongoUri(mongoUri)}...`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmail });
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

    if (existingUser) {
      console.log(`ℹ️ User found with email ${maskEmail(adminEmail)}. Upgrading/updating to active Admin...`);

      existingUser.passwordHash = passwordHash;
      existingUser.role = 'admin';
      existingUser.emailVerified = true;
      existingUser.phoneVerified = true;
      existingUser.isAccountActive = true;
      existingUser.isDemoAccount = false;
      if (adminName && (!existingUser.name || existingUser.name === 'Platform Admin')) {
        existingUser.name = adminName;
      }

      await existingUser.save();
      console.log(`🎉 Admin account successfully updated and activated for: ${maskEmail(adminEmail)}`);
    } else {
      console.log(`➕ Creating new production admin account for: ${maskEmail(adminEmail)}...`);

      const newAdmin = new User({
        name: adminName,
        email: adminEmail,
        passwordHash,
        phone: adminPhone,
        role: 'admin',
        emailVerified: true,
        phoneVerified: true,
        isAccountActive: true,
        isDemoAccount: false,
      });

      await newAdmin.save();
      console.log(`🎉 Production admin account successfully created and activated for: ${maskEmail(adminEmail)}`);
    }

    console.log('🔒 Verification status: Role=admin, EmailVerified=true, AccountActive=true');
  } catch (error: any) {
    console.error('❌ Failed to provision production admin account:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Database connection closed safely.');
    }
  }
}

createProductionAdmin();
