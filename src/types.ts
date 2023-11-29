export type Message = {
  type: "error" | "warn" | "info" | "success";
  message: string;
};




export type Meta = {
  _elapsedTime?: number | string;
  _startLine?: number;
  _endLine?: number;
  _filePath?: string;
  _relativeFilePath?: string;
  _noAnimation?: boolean;

  _isEmptyBlock?: boolean;
  _isDoneBlock?: boolean;
  _isSuccessfulBlock?: boolean;
  _isFailedBlock?: boolean;
  _isIgnoredBlock?: boolean;
  _errorDisplayed?: boolean;

  // [key: string]: any;
  [key: string]: unknown;
};