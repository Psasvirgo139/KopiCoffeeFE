import api, { API_HOST } from "./base";

// Prefer explicit env var, otherwise fall back to API_HOST exported by the base wrapper
const host = process.env.REACT_APP_BACKEND_HOST || API_HOST;

export function getShifts(params = {}, controller) {
  const url = `${host}/apiv1/shifts`;
  return api.get(url, { params, signal: controller?.signal });
}

export function createShift(body, token, controller) {
  const url = `${host}/apiv1/admin/shifts`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function upsertPositionRules(shiftId, payload, token, controller) {
  // Reuse update shift endpoint to upsert rules
  const url = `${host}/apiv1/admin/shifts/${shiftId}`;
  return api.patch(
    url,
    { positionRules: payload },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
}

export function getPositionRules(shiftId, controller) {
  const url = `${host}/apiv1/shifts/${shiftId}/position-rules`;
  return api.get(url, { signal: controller?.signal });
}

export function deleteShift(shiftId, token, controller) {
  // Soft-delete by setting active = false
  const url = `${host}/apiv1/admin/shifts/${shiftId}/active?active=false`;
  return api.patch(url, null, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function setShiftActive(shiftId, active, token, controller) {
  const url = `${host}/apiv1/admin/shifts/${shiftId}/active?active=${active}`;
  return api.patch(url, null, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function getShiftById(shiftId, controller) {
  const url = `${host}/apiv1/shifts/${shiftId}`;
  return api.get(url, { signal: controller?.signal });
}

export function updateShift(shiftId, body, token, controller) {
  const url = `${host}/apiv1/admin/shifts/${shiftId}`;
  return api.patch(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function getEmployeeShiftsByShiftAndDate(date, shiftId, controller) {
  const url = `${host}/apiv1/employee-shifts?date=${encodeURIComponent(
    date
  )}&shiftId=${encodeURIComponent(shiftId)}`;
  return api.get(url, { signal: controller?.signal });
}

export function getShiftHasOccurrence(shiftId, controller) {
  const url = `${host}/apiv1/employee-shifts/exists?shiftId=${encodeURIComponent(
    shiftId
  )}`;
  return api.get(url, { signal: controller?.signal });
}

export function getEmployees(token, controller) {
  const url = `${host}/apiv1/admin/employees`;
  return api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function addEmployeeToShift(body, token, controller) {
  const url = `${host}/apiv1/admin/employee-shifts`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function removeEmployeeFromShift(employeeShiftId, token, controller) {
  const url = `${host}/apiv1/admin/employee-shifts/${employeeShiftId}`;
  return api.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function cancelEmployeeShift(employeeShiftId, body, token, controller) {
  const url = `${host}/apiv1/employee-shifts/${employeeShiftId}/cancel`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function restoreEmployeeShift(employeeShiftId, token, controller) {
  const url = `${host}/apiv1/employee-shifts/${employeeShiftId}/restore`;
  return api.post(url, null, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function checkinEmployeeShift(employeeShiftId, token, controller) {
  const url = `${host}/apiv1/employee-shifts/${employeeShiftId}/checkin`;
  return api.post(url, null, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function checkoutEmployeeShift(employeeShiftId, token, controller) {
  const url = `${host}/apiv1/employee-shifts/${employeeShiftId}/checkout`;
  return api.post(url, null, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

// Lightweight stubs for other schedule-related functions used across pages.
export function createWorkSchedule(body, token, controller) {
  const url = `${host}/apiv1/work-schedules`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function generateFromPattern(body, token, controller) {
  const url = `${host}/apiv1/work-schedules/generate-from-pattern`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function getGenerations(token, controller) {
  const url = `${host}/apiv1/admin/work-schedules/generations`;
  return api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function getRecurrencePatterns(controller, token) {
  const url = `${host}/apiv1/recurrence-patterns`;
  const opts = { signal: controller?.signal };
  if (token) {
    opts.headers = { Authorization: `Bearer ${token}` };
  }
  return api.get(url, opts);
}

export function getWorkSchedulesWithRecurrence(token, controller) {
  const url = `${host}/apiv1/admin/work-schedules/with-recurrence`;
  return api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function getWorkScheduleDetails(id, token, controller) {
  const url = `${host}/apiv1/admin/work-schedules/${encodeURIComponent(id)}`;
  return api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function deleteWorkSchedule(id, token, controller) {
  const url = `${host}/apiv1/admin/work-schedules/${encodeURIComponent(id)}`;
  return api.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function removeDateFromWorkSchedule(id, date, token, controller) {
  const url = `${host}/apiv1/admin/work-schedules/${encodeURIComponent(
    id
  )}/date?date=${encodeURIComponent(date)}`;
  return api.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function createRecurrencePattern(body, token, controller) {
  const url = `${host}/apiv1/admin/recurrence-patterns`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function updateRecurrencePattern(id, body, token, controller) {
  const url = `${host}/apiv1/admin/recurrence-patterns/${id}`;
  return api.patch(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export function deleteRecurrencePattern(id, token, controller) {
  const url = `${host}/apiv1/admin/recurrence-patterns/${id}`;
  return api.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

// Employee shifts / assignments related stubs
export function getEmployeeShiftsByDate(date, controller) {
  const url = `${host}/apiv1/employee-shifts?date=${encodeURIComponent(date)}`;
  return api.get(url, { signal: controller?.signal });
}

export function getEmployeeShiftsByRange(start, end, controller, shiftId) {
  let url = `${host}/apiv1/employee-shifts/range?start=${encodeURIComponent(
    start
  )}&end=${encodeURIComponent(end)}`;
  if (shiftId) url += `&shiftId=${encodeURIComponent(shiftId)}`;
  return api.get(url, { signal: controller?.signal });
}

export function validateShiftConstraints(date, shiftId, controller) {
  const url = `${host}/apiv1/shifts/${shiftId}/validate?date=${encodeURIComponent(
    date
  )}`;
  return api.get(url, { signal: controller?.signal });
}

export function removeShiftSlotForDate(date, shiftId, token, controller) {
  const url = `${host}/apiv1/admin/employee-shifts/remove`;
  return api.post(
    url,
    { date, shiftId },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
}

export function addOpenShiftSlot(date, shiftId, token, controller) {
  const url = `${host}/apiv1/admin/employee-shifts/add-open`;
  return api.post(
    url,
    { date, shiftId },
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller?.signal,
    }
  );
}

export function copyAssignments(body, token, controller) {
  const url = `${host}/apiv1/admin/employee-shifts/copy`;
  return api.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller?.signal,
  });
}

export default {
  getShifts,
  createShift,
  upsertPositionRules,
  getPositionRules,
  deleteShift,
  setShiftActive,
  getShiftById,
  updateShift,
  getEmployeeShiftsByShiftAndDate,
  getEmployees,
  addEmployeeToShift,
  removeEmployeeFromShift,
  cancelEmployeeShift,
  restoreEmployeeShift,
  checkinEmployeeShift,
  checkoutEmployeeShift,
  createWorkSchedule,
  generateFromPattern,
  getRecurrencePatterns,
  createRecurrencePattern,
  updateRecurrencePattern,
  deleteRecurrencePattern,
  getEmployeeShiftsByDate,
  getEmployeeShiftsByRange,
  validateShiftConstraints,
  removeShiftSlotForDate,
  addOpenShiftSlot,
  copyAssignments,
};
