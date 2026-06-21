export function connectId(id?: string | null) {
  return id ? { connect: { id } } : undefined;
}