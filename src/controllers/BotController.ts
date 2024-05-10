import { inject, injectable } from "tsyringe";

import { ApplicationContext } from "@spt-diffpatch/context/ApplicationContext";
import { ContextVariableType } from "@spt-diffpatch/context/ContextVariableType";
import { BotGenerator } from "@spt-diffpatch/generators/BotGenerator";
import { BotDifficultyHelper } from "@spt-diffpatch/helpers/BotDifficultyHelper";
import { BotHelper } from "@spt-diffpatch/helpers/BotHelper";
import { ProfileHelper } from "@spt-diffpatch/helpers/ProfileHelper";
import { IGenerateBotsRequestData } from "@spt-diffpatch/models/eft/bot/IGenerateBotsRequestData";
import { IPmcData } from "@spt-diffpatch/models/eft/common/IPmcData";
import { IBotBase } from "@spt-diffpatch/models/eft/common/tables/IBotBase";
import { IBotCore } from "@spt-diffpatch/models/eft/common/tables/IBotCore";
import { Difficulty } from "@spt-diffpatch/models/eft/common/tables/IBotType";
import { IGetRaidConfigurationRequestData } from "@spt-diffpatch/models/eft/match/IGetRaidConfigurationRequestData";
import { ConfigTypes } from "@spt-diffpatch/models/enums/ConfigTypes";
import { WildSpawnTypeNumber } from "@spt-diffpatch/models/enums/WildSpawnTypeNumber";
import { BotGenerationDetails } from "@spt-diffpatch/models/spt/bots/BotGenerationDetails";
import { IBotConfig } from "@spt-diffpatch/models/spt/config/IBotConfig";
import { IPmcConfig } from "@spt-diffpatch/models/spt/config/IPmcConfig";
import { ILogger } from "@spt-diffpatch/models/spt/utils/ILogger";
import { ConfigServer } from "@spt-diffpatch/servers/ConfigServer";
import { DatabaseServer } from "@spt-diffpatch/servers/DatabaseServer";
import { BotGenerationCacheService } from "@spt-diffpatch/services/BotGenerationCacheService";
import { LocalisationService } from "@spt-diffpatch/services/LocalisationService";
import { MatchBotDetailsCacheService } from "@spt-diffpatch/services/MatchBotDetailsCacheService";
import { SeasonalEventService } from "@spt-diffpatch/services/SeasonalEventService";
import { JsonUtil } from "@spt-diffpatch/utils/JsonUtil";
import { RandomUtil } from "@spt-diffpatch/utils/RandomUtil";

@injectable()
export class BotController
{
    protected botConfig: IBotConfig;
    protected pmcConfig: IPmcConfig;

    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("DatabaseServer") protected databaseServer: DatabaseServer,
        @inject("BotGenerator") protected botGenerator: BotGenerator,
        @inject("BotHelper") protected botHelper: BotHelper,
        @inject("BotDifficultyHelper") protected botDifficultyHelper: BotDifficultyHelper,
        @inject("BotGenerationCacheService") protected botGenerationCacheService: BotGenerationCacheService,
        @inject("MatchBotDetailsCacheService") protected matchBotDetailsCacheService: MatchBotDetailsCacheService,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("SeasonalEventService") protected seasonalEventService: SeasonalEventService,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("ConfigServer") protected configServer: ConfigServer,
        @inject("ApplicationContext") protected applicationContext: ApplicationContext,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("JsonUtil") protected jsonUtil: JsonUtil,
    )
    {
        this.botConfig = this.configServer.getConfig(ConfigTypes.BOT);
        this.pmcConfig = this.configServer.getConfig(ConfigTypes.PMC);
    }

    /**
     * Return the number of bot load-out varieties to be generated
     * @param type bot Type we want the load-out gen count for
     * @returns number of bots to generate
     */
    public getBotPresetGenerationLimit(type: string): number
    {
        const value = this.botConfig.presetBatch[(type === "assaultGroup") ? "assault" : type];

        if (!value)
        {
            this.logger.warning(`No value found for bot type ${type}, defaulting to 30`);

            return 30;
        }
        return value;
    }

    /**
     * Handle singleplayer/settings/bot/difficulty
     * Get the core.json difficulty settings from database/bots
     * @returns IBotCore
     */
    public getBotCoreDifficulty(): IBotCore
    {
        return this.databaseServer.getTables().bots.core;
    }

    /**
     * Get bot difficulty settings
     * Adjust PMC settings to ensure they engage the correct bot types
     * @param type what bot the server is requesting settings for
     * @param diffLevel difficulty level server requested settings for
     * @param ignoreRaidSettings should raid settings chosen pre-raid be ignored
     * @returns Difficulty object
     */
    public getBotDifficulty(type: string, diffLevel: string, ignoreRaidSettings = false): Difficulty
    {
        let difficulty = diffLevel.toLowerCase();

        const raidConfig = this.applicationContext.getLatestValue(ContextVariableType.RAID_CONFIGURATION)?.getValue<
            IGetRaidConfigurationRequestData
        >();
        if (!(raidConfig || ignoreRaidSettings))
        {
            this.logger.error(
                this.localisationService.getText("bot-missing_application_context", "RAID_CONFIGURATION"),
            );
        }

        // Check value chosen in pre-raid difficulty dropdown
        // If value is not 'asonline', change requested difficulty to be what was chosen in dropdown
        const botDifficultyDropDownValue = raidConfig?.wavesSettings.botDifficulty.toLowerCase() ?? "asonline";
        if (botDifficultyDropDownValue !== "asonline")
        {
            difficulty = this.botDifficultyHelper.convertBotDifficultyDropdownToBotDifficulty(
                botDifficultyDropDownValue,
            );
        }

        let difficultySettings: Difficulty;
        const lowercasedBotType = type.toLowerCase();
        switch (lowercasedBotType)
        {
            case this.pmcConfig.bearType.toLowerCase():
                difficultySettings = this.botDifficultyHelper.getPmcDifficultySettings(
                    "bear",
                    difficulty,
                    this.pmcConfig.usecType,
                    this.pmcConfig.bearType,
                );
                break;
            case this.pmcConfig.usecType.toLowerCase():
                difficultySettings = this.botDifficultyHelper.getPmcDifficultySettings(
                    "usec",
                    difficulty,
                    this.pmcConfig.usecType,
                    this.pmcConfig.bearType,
                );
                break;
            default:
                difficultySettings = this.botDifficultyHelper.getBotDifficultySettings(type, difficulty);
                break;
        }

        return difficultySettings;
    }

    public getAllBotDifficulties(): Record<string, any>
    {
        const result = {};

        const botDb = this.databaseServer.getTables().bots.types;
        const botTypes = Object.keys(WildSpawnTypeNumber).filter((v) => Number.isNaN(Number(v)));
        for (let botType of botTypes)
        {
            const enumType = botType.toLowerCase();
            // sptBear/sptUsec need to be converted into `usec`/`bear` so we can read difficulty settings from bots/types
            botType = this.botHelper.isBotPmc(botType)
                ? this.botHelper.getPmcSideByRole(botType).toLowerCase()
                : botType.toLowerCase();

            const botDetails = botDb[botType];
            if (!botDetails?.difficulty)
            {
                continue;
            }

            const botDifficulties = Object.keys(botDetails.difficulty);
            result[enumType] = {};
            for (const difficulty of botDifficulties)
            {
                result[enumType][difficulty] = this.getBotDifficulty(enumType, difficulty, true);
            }
        }

        return result;
    }

    /**
     * Generate bot profiles and store in cache
     * @param sessionId Session id
     * @param info bot generation request info
     * @returns IBotBase array
     */
    public generate(sessionId: string, info: IGenerateBotsRequestData): IBotBase[]
    {
        const pmcProfile = this.profileHelper.getPmcProfile(sessionId);

        const isFirstGen = info.conditions.length > 1;
        if (isFirstGen)
        {
            return this.generateBotsFirstTime(info, pmcProfile, sessionId);
        }

        return this.returnSingleBotFromCache(sessionId, info);
    }

    /**
     * On first bot generation bots are generated and stored inside a cache, ready to be used later
     * @param request Bot generation request object
     * @param pmcProfile Player profile
     * @param sessionId Session id
     * @returns
     */
    protected generateBotsFirstTime(
        request: IGenerateBotsRequestData,
        pmcProfile: IPmcData,
        sessionId: string,
    ): IBotBase[]
    {
        // Clear bot cache before any work starts
        this.botGenerationCacheService.clearStoredBots();

        const allPmcsHaveSameNameAsPlayer = this.randomUtil.getChance100(
            this.pmcConfig.allPMCsHavePlayerNameWithRandomPrefixChance,
        );
        for (const condition of request.conditions)
        {
            const botGenerationDetails: BotGenerationDetails = {
                isPmc: false,
                side: "Savage",
                role: condition.Role,
                playerLevel: pmcProfile.Info.Level,
                playerName: pmcProfile.Info.Nickname,
                botRelativeLevelDeltaMax: this.pmcConfig.botRelativeLevelDeltaMax,
                botRelativeLevelDeltaMin: this.pmcConfig.botRelativeLevelDeltaMin,
                botCountToGenerate: this.botConfig.presetBatch[condition.Role],
                botDifficulty: condition.Difficulty,
                isPlayerScav: false,
                allPmcsHaveSameNameAsPlayer: allPmcsHaveSameNameAsPlayer,
            };

            // Event bots need special actions to occur, set data up for them
            const isEventBot = condition.Role.toLowerCase().includes("event");
            if (isEventBot)
            {
                // Add eventRole data + reassign role property to be base type
                botGenerationDetails.eventRole = condition.Role;
                botGenerationDetails.role = this.seasonalEventService.getBaseRoleForEventBot(
                    botGenerationDetails.eventRole,
                );
            }

            // Custom map waves can have spt roles in them
            // Is bot type sptusec/sptbear, set is pmc true and set side
            if (this.botHelper.botRoleIsPmc(condition.Role))
            {
                botGenerationDetails.isPmc = true;
                botGenerationDetails.side = this.botHelper.getPmcSideByRole(condition.Role);
            }

            // Loop over and make x bots for this bot wave
            const cacheKey = `${
                botGenerationDetails.eventRole ?? botGenerationDetails.role
            }${botGenerationDetails.botDifficulty}`;
            for (let i = 0; i < botGenerationDetails.botCountToGenerate; i++)
            {
                // Generate and add bot to cache
                const detailsClone = this.jsonUtil.clone(botGenerationDetails);
                const botToCache = this.botGenerator.prepareAndGenerateBot(sessionId, detailsClone);
                this.botGenerationCacheService.storeBots(cacheKey, [botToCache]);
            }

            this.logger.debug(
                `Generated ${botGenerationDetails.botCountToGenerate} ${botGenerationDetails.role} (${
                    botGenerationDetails.eventRole ?? ""
                }) ${botGenerationDetails.botDifficulty} bots`,
            );
        }

        return [];
    }

    /**
     * Pull a single bot out of cache and return, if cache is empty add bots to it and then return
     * @param sessionId Session id
     * @param request Bot generation request object
     * @returns Single IBotBase object
     */
    protected returnSingleBotFromCache(sessionId: string, request: IGenerateBotsRequestData): IBotBase[]
    {
        const pmcProfile = this.profileHelper.getPmcProfile(sessionId);
        const requestedBot = request.conditions[0];

        // Create gen request for when cache is empty
        const botGenerationDetails: BotGenerationDetails = {
            isPmc: false,
            side: "Savage",
            role: requestedBot.Role,
            playerLevel: pmcProfile.Info.Level,
            playerName: pmcProfile.Info.Nickname,
            botRelativeLevelDeltaMax: this.pmcConfig.botRelativeLevelDeltaMax,
            botRelativeLevelDeltaMin: this.pmcConfig.botRelativeLevelDeltaMin,
            botCountToGenerate: this.botConfig.presetBatch[requestedBot.Role],
            botDifficulty: requestedBot.Difficulty,
            isPlayerScav: false,
        };

        // Event bots need special actions to occur, set data up for them
        const isEventBot = requestedBot.Role.toLowerCase().includes("event");
        if (isEventBot)
        {
            // Add eventRole data + reassign role property
            botGenerationDetails.eventRole = requestedBot.Role;
            botGenerationDetails.role = this.seasonalEventService.getBaseRoleForEventBot(
                botGenerationDetails.eventRole,
            );
        }

        if (this.botHelper.isBotPmc(botGenerationDetails.role))
        {
            botGenerationDetails.isPmc = true;
            botGenerationDetails.side = this.botHelper.getPmcSideByRole(requestedBot.Role);
        }

        // Roll chance to be pmc if type is allowed to be one
        const botConvertRateMinMax = this.pmcConfig.convertIntoPmcChance[requestedBot.Role.toLowerCase()];
        if (botConvertRateMinMax)
        {
            // Should bot become PMC
            const convertToPmc = this.botHelper.rollChanceToBePmc(requestedBot.Role, botConvertRateMinMax);
            if (convertToPmc)
            {
                botGenerationDetails.isPmc = true;
                botGenerationDetails.role = this.botHelper.getRandomizedPmcRole();
                botGenerationDetails.side = this.botHelper.getPmcSideByRole(botGenerationDetails.role);
                botGenerationDetails.botDifficulty = this.getPMCDifficulty(requestedBot.Difficulty);
                botGenerationDetails.botCountToGenerate = this.botConfig.presetBatch[botGenerationDetails.role];
            }
        }

        // Construct cache key
        const cacheKey = `${
            botGenerationDetails.eventRole ?? botGenerationDetails.role
        }${botGenerationDetails.botDifficulty}`;

        // Check cache for bot using above key
        if (!this.botGenerationCacheService.cacheHasBotOfRole(cacheKey))
        {
            // No bot in cache, generate new and return one
            for (let i = 0; i < botGenerationDetails.botCountToGenerate; i++)
            {
                const botToCache = this.botGenerator.prepareAndGenerateBot(sessionId, botGenerationDetails);
                this.botGenerationCacheService.storeBots(cacheKey, [botToCache]);
            }

            this.logger.debug(
                `Generated ${botGenerationDetails.botCountToGenerate} ${botGenerationDetails.role} (${
                    botGenerationDetails.eventRole ?? ""
                }) ${botGenerationDetails.botDifficulty} bots`,
            );
        }

        const desiredBot = this.botGenerationCacheService.getBot(cacheKey);
        this.botGenerationCacheService.storeUsedBot(desiredBot);

        return [desiredBot];
    }

    /**
     * Get the difficulty passed in, if its not "asonline", get selected difficulty from config
     * @param requestedDifficulty
     * @returns
     */
    public getPMCDifficulty(requestedDifficulty: string): string
    {
        // Maybe return a random difficulty...
        if (this.pmcConfig.difficulty.toLowerCase() === "asonline")
        {
            return requestedDifficulty;
        }

        if (this.pmcConfig.difficulty.toLowerCase() === "random")
        {
            return this.botDifficultyHelper.chooseRandomDifficulty();
        }

        return this.pmcConfig.difficulty;
    }

    /**
     * Get the max number of bots allowed on a map
     * Looks up location player is entering when getting cap value
     * @returns cap number
     */
    public getBotCap(): number
    {
        const defaultMapCapId = "default";
        const raidConfig = this.applicationContext.getLatestValue(ContextVariableType.RAID_CONFIGURATION).getValue<
            IGetRaidConfigurationRequestData
        >();

        if (!raidConfig)
        {
            this.logger.warning(this.localisationService.getText("bot-missing_saved_match_info"));
        }

        const mapName = raidConfig ? raidConfig.location : defaultMapCapId;

        let botCap = this.botConfig.maxBotCap[mapName.toLowerCase()];
        if (!botCap)
        {
            this.logger.warning(
                this.localisationService.getText(
                    "bot-no_bot_cap_found_for_location",
                    raidConfig.location.toLowerCase(),
                ),
            );
            botCap = this.botConfig.maxBotCap[defaultMapCapId];
        }

        return botCap;
    }

    public getAiBotBrainTypes(): any
    {
        return {
            pmc: this.pmcConfig.pmcType,
            assault: this.botConfig.assaultBrainType,
            playerScav: this.botConfig.playerScavBrainType,
        };
    }
}