import { inject, injectable } from "tsyringe";

import { ICreateGroupRequestData } from "@spt-diffpatch/models/eft/match/ICreateGroupRequestData";
import { SaveServer } from "@spt-diffpatch/servers/SaveServer";
import { TimeUtil } from "@spt-diffpatch/utils/TimeUtil";

@injectable()
export class MatchLocationService
{
    protected locations = {};

    constructor(
        @inject("TimeUtil") protected timeUtil: TimeUtil,
        @inject("SaveServer") protected saveServer: SaveServer,
    )
    {}

    public deleteGroup(info: any): void
    {
        for (const locationID in this.locations)
        {
            for (const groupID in this.locations[locationID].groups)
            {
                if (groupID === info.groupId)
                {
                    delete this.locations[locationID].groups[groupID];
                    return;
                }
            }
        }
    }
}