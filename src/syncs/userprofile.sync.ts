/**
 * UserProfile synchronizations
 * All routes require session authentication
 * 
 * NOTE: Methods starting with "_" are queries and must use frames.query() in where clause
 */

import { Requesting, Sessioning, UserProfile } from "@concepts";
import { actions, Frames, Sync } from "@engine";

// ============================================
// CREATE USER (Action)
// ============================================

export const CreateUserRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/createUser", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserProfile.createUser, { owner: user }]),
});

export const CreateUserResponse: Sync = ({ request, profile }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/createUser" }, { request }],
    [UserProfile.createUser, {}, { profile }],
  ),
  then: actions([Requesting.respond, { request, profile }]),
});

export const CreateUserError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/createUser" }, { request }],
    [UserProfile.createUser, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// GET PROFILE (Query - handled in where clause)
// ============================================

export const GetProfileRequest: Sync = ({ request, session, user, profile }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/_getProfile", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    // First verify session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, authError: true });
    }
    // Then call the query (UserProfile._getProfile uses 'user' not 'owner')
    frames = await frames.query(UserProfile._getProfile, { user }, { profile });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [profile]: null });
    }
    return frames;
  },
  then: actions([Requesting.respond, { request, profile }]),
});

// ============================================
// UPDATE PROFILE NAME (Action)
// ============================================

export const UpdateProfileNameRequest: Sync = ({ request, session, user, name }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateProfileName", session, name },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserProfile.updateProfileName, { owner: user, name }]),
});

export const UpdateProfileNameResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfileName" }, { request }],
    [UserProfile.updateProfileName, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateProfileNameError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfileName" }, { request }],
    [UserProfile.updateProfileName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE PROFILE PICTURE (Action)
// ============================================

export const UpdateProfilePictureRequest: Sync = ({ request, session, user, profilePicture }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateProfilePicture", session, profilePicture },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserProfile.updateProfilePicture, { owner: user, profilePicture }]),
});

export const UpdateProfilePictureResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfilePicture" }, { request }],
    [UserProfile.updateProfilePicture, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateProfilePictureError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateProfilePicture" }, { request }],
    [UserProfile.updateProfilePicture, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE PASSWORD (Action)
// ============================================

export const UpdatePasswordRequest: Sync = ({ request, session, user, currentPassword, newPassword }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updatePassword", session, currentPassword, newPassword },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserProfile.updatePassword, { owner: user, currentPassword, newPassword }]),
});

export const UpdatePasswordResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updatePassword" }, { request }],
    [UserProfile.updatePassword, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdatePasswordError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updatePassword" }, { request }],
    [UserProfile.updatePassword, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// UPDATE INTERESTS (Action)
// ============================================

export const UpdateInterestsRequest: Sync = ({ request, session, user, interests }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/updateInterests", session, interests },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserProfile.updateInterests, { owner: user, interests }]),
});

export const UpdateInterestsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateInterests" }, { request }],
    [UserProfile.updateInterests, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const UpdateInterestsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/updateInterests" }, { request }],
    [UserProfile.updateInterests, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// ENSURE FIELDS OF INTERESTS EXIST (Action)
// ============================================

export const EnsureFieldsOfInterestsExistRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserProfile/ensureFieldsOfInterestsExist", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    return frames.filter(($) => $[user] !== undefined);
  },
  then: actions([UserProfile.ensureFieldsOfInterestsExist, { owner: user }]),
});

export const EnsureFieldsOfInterestsExistResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/ensureFieldsOfInterestsExist" }, { request }],
    [UserProfile.ensureFieldsOfInterestsExist, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const EnsureFieldsOfInterestsExistError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserProfile/ensureFieldsOfInterestsExist" }, { request }],
    [UserProfile.ensureFieldsOfInterestsExist, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
