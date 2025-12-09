/**
 * Authentication synchronizations
 * Handles login and signup flows with session creation
 */

import { Requesting, Sessioning, UserAuth, UserProfile } from "@concepts";
import { actions, Frames, Sync } from "@engine";

// ============================================
// LOGIN FLOW
// ============================================

/**
 * When a login request comes in with valid credentials,
 * call the login action.
 */
export const LoginRequest: Sync = ({ request, email, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuth/login", email, password },
    { request },
  ]),
  then: actions([UserAuth.login, { email, password }]),
});

/**
 * When login succeeds, create a session
 * Use where clause to extract user._id
 */
export const LoginSuccessSession: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/login" }, { request }],
    [UserAuth.login, {}, { user }],
  ),
  where: async (frames) => {
    // Extract user._id from the matched user object
    return new Frames(...frames.map(($) => ({
      ...$,
      [userId]: $[user]._id
    })));
  },
  then: actions([Sessioning.create, { user: userId }]),
});

/**
 * After session is created for login, send the response
 */
export const LoginSessionResponse: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/login" }, { request }],
    [UserAuth.login, {}, { user }],
    [Sessioning.create, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

/**
 * When login fails, respond with the error
 */
export const LoginErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/login" }, { request }],
    [UserAuth.login, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// SIGNUP FLOW
// ============================================

/**
 * When a signup request comes in, create the user
 */
export const SignupRequest: Sync = ({ request, email, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/UserAuth/signup", email, password },
    { request },
  ]),
  then: actions([UserAuth.signup, { email, password }]),
});

/**
 * When signup succeeds, create a session
 * Use where clause to extract user._id
 */
export const SignupSuccessSession: Sync = ({ request, user, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/signup" }, { request }],
    [UserAuth.signup, {}, { user }],
  ),
  where: async (frames) => {
    // Extract user._id from the matched user object
    return new Frames(...frames.map(($) => ({
      ...$,
      [userId]: $[user]._id
    })));
  },
  then: actions([Sessioning.create, { user: userId }]),
});

/**
 * When signup succeeds, also create a user profile
 * Use where clause to extract user properties
 */
export const SignupCreateProfile: Sync = ({ request, user, uid, userEmail }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/signup" }, { request }],
    [UserAuth.signup, {}, { user }],
  ),
  where: async (frames) => {
    // Extract properties from the matched user object
    return new Frames(...frames.map(($) => ({
      ...$,
      [uid]: $[user]._id,
      [userEmail]: $[user].email
    })));
  },
  then: actions([UserProfile.createUser, {
    uid: uid,
    name: "",
    email: userEmail,
    profilePicture: "",
    fieldOfInterests: []
  }]),
});

/**
 * After session is created for signup, send the response
 */
export const SignupSessionResponse: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/signup" }, { request }],
    [UserAuth.signup, {}, { user }],
    [Sessioning.create, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

/**
 * When signup fails, respond with the error
 */
export const SignupErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuth/signup" }, { request }],
    [UserAuth.signup, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ============================================
// LOGOUT FLOW
// ============================================

/**
 * When a logout request comes in with a session, delete it
 */
export const LogoutRequest: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/Sessioning/delete", session },
    { request },
  ]),
  then: actions([Sessioning.delete, { session }]),
});

/**
 * Respond to logout success
 */
export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete" }, { request }],
    [Sessioning.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

/**
 * Respond to logout error
 */
export const LogoutErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete" }, { request }],
    [Sessioning.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
