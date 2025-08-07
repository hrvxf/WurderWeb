"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Cropper from "react-easy-crop";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getCroppedImg } from "@/app/utils/cropImage"; // make sure this file exists
import { auth } from "@/lib/firebase";

const placeholderAvatar = "/profile-placeholder.png";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  firstName: string;
  lastName: string;
  avatar: string;
  onProfileUpdated: (url: string) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  firstName: initialFirstName,
  lastName: initialLastName,
  avatar,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(avatar || placeholderAvatar);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setPreview(avatar || placeholderAvatar);
  }, [initialFirstName, initialLastName, avatar]);

  const onCropComplete = (_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(preview, croppedAreaPixels);
      const storage = getStorage();
      const db = getFirestore();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
      await uploadBytes(storageRef, croppedBlob);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        firstName,
        lastName,
        avatar: downloadURL,
      });

      onProfileUpdated(downloadURL);
      onClose();
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose}></div>

      {/* Modal (full-screen cropper for mobile) */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto md:max-h-[90vh] flex flex-col z-10">
        <h2 className="text-2xl font-bold text-center mt-4">Edit Profile</h2>

        {/* Cropping area (full-screen for mobile) */}
        {selectedFile ? (
          <div className="relative flex-1 w-full h-[50vh] bg-gray-200">
            <Cropper
              image={preview}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        ) : (
          <img
            src={preview}
            alt="Preview"
            className="rounded-full border-2 border-yellow-600 mx-auto my-4 w-32 h-32 object-cover"
          />
        )}

        {/* Inputs */}
        <div className="p-4">
          <input
            type="text"
            placeholder="First Name"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-black"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <input
            type="file"
            accept="image/*"
            className="border p-2 block w-full mb-4"
            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
          />

          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleSave}
              className="bg-yellow-600 hover:bg-yellow-700 w-full"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-black w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
