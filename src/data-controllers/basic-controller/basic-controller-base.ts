import ProgramContext from "@dataTypes/program-context";

abstract class BasicDataControllerBase {
  protected _constructionOptions: Record<string, unknown>;
  programContext: ProgramContext;

  protected _dataLocation: string;

  set dataLocation(loc: string) {
    this._dataLocation = loc;
  }

  get dataLocation(): string {
    const output = this._dataLocation ?? './';

    return output;
  }

  constructor(programContext: ProgramContext) {
    this.programContext = programContext;
  }
}

export default BasicDataControllerBase;