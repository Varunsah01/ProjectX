export interface ListResponse<T> {
  data: T[];
}

export interface DetailResponse<T> {
  data: T;
}

export interface MutationResponse {
  ok: true;
}
