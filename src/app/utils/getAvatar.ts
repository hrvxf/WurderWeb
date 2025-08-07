import placeholderAvatar from "/public/profile-placeholder.png";

export default function getAvatar(avatarUrl?: string) {
  if (
    !avatarUrl ||
    avatarUrl.trim() === "" ||
    avatarUrl === "null" ||
    avatarUrl === "undefined"
  ) {
    return placeholderAvatar; // Return the imported static image
  }
  return avatarUrl;
}
