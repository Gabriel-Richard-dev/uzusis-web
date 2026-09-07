type GetStorageInput = {
    key: string;
  };
  export type GetStorage = <T = any>(input: GetStorageInput) => T;
  
  type SetStorageInput = {
    key: string;
    value: any;
  };
  export type SetStorage = (input: SetStorageInput) => void;
  
  type RemoveStorageInput = {
    key: string;
  };
  export type RemoveStorage = (input: RemoveStorageInput) => void;
  