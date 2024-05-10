import { inject, injectable } from "tsyringe";

import { BundleLoader } from "@spt-diffpatch/loaders/BundleLoader";
import { ConfigTypes } from "@spt-diffpatch/models/enums/ConfigTypes";
import { IHttpConfig } from "@spt-diffpatch/models/spt/config/IHttpConfig";
import { ConfigServer } from "@spt-diffpatch/servers/ConfigServer";
import { HttpResponseUtil } from "@spt-diffpatch/utils/HttpResponseUtil";

@injectable()
export class BundleCallbacks
{
    protected httpConfig: IHttpConfig;

    constructor(
        @inject("HttpResponseUtil") protected httpResponse: HttpResponseUtil,
        @inject("BundleLoader") protected bundleLoader: BundleLoader,
        @inject("ConfigServer") protected configServer: ConfigServer,
    )
    {
        this.httpConfig = this.configServer.getConfig(ConfigTypes.HTTP);
    }

    /**
     * Handle singleplayer/bundles
     */
    public getBundles(url: string, info: any, sessionID: string): string
    {
        return this.httpResponse.noBody(this.bundleLoader.getBundles());
    }

    public getBundle(url: string, info: any, sessionID: string): string
    {
        return "BUNDLE";
    }
}