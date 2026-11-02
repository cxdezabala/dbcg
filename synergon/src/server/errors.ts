export class ForbiddenError extends Error { status = 403; constructor(msg = 'Forbidden — outside your authorised scope') { super(msg); } }
export class UnauthenticatedError extends Error { status = 401; constructor() { super('Unauthenticated'); } }
