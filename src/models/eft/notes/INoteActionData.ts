import { IBaseInteractionRequestData } from "@spt-diffpatch/models/eft/common/request/IBaseInteractionRequestData";

export interface INoteActionData extends IBaseInteractionRequestData
{
    Action: string;
    index: number;
    note: INote;
}

export interface INote
{
    Time: number;
    Text: string;
}
