export interface IApiResponseFormat<DTO> {
  status: number;
  message: string;
  data: DTO;
}
