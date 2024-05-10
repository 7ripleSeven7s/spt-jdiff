import { IChatCommand, ICommandoCommand } from "@spt-diffpatch/helpers/Dialogue/Commando/IChatCommand";
import { IDialogueChatBot } from "@spt-diffpatch/helpers/Dialogue/IDialogueChatBot";
import { ISendMessageRequest } from "@spt-diffpatch/models/eft/dialog/ISendMessageRequest";
import { IUserDialogInfo } from "@spt-diffpatch/models/eft/profile/IAkiProfile";
import { ILogger } from "@spt-diffpatch/models/spt/utils/ILogger";
import { MailSendService } from "@spt-diffpatch/services/MailSendService";

export abstract class AbstractDialogueChatBot implements IDialogueChatBot
{
    public constructor(
        protected logger: ILogger,
        protected mailSendService: MailSendService,
        protected chatCommands: IChatCommand[] | ICommandoCommand[],
    )
    {
    }

    /**
     * @deprecated As of v3.7.6. Use registerChatCommand.
     */
    // TODO: v3.9.0 - Remove registerCommandoCommand method.
    public registerCommandoCommand(chatCommand: IChatCommand | ICommandoCommand): void
    {
        this.registerChatCommand(chatCommand);
    }

    public registerChatCommand(chatCommand: IChatCommand | ICommandoCommand): void
    {
        if (this.chatCommands.some((cc) => cc.getCommandPrefix() === chatCommand.getCommandPrefix()))
        {
            throw new Error(
                `The command "${chatCommand.getCommandPrefix()}" attempting to be registered already exists.`,
            );
        }
        this.chatCommands.push(chatCommand);
    }

    public abstract getChatBot(): IUserDialogInfo;

    protected abstract getUnrecognizedCommandMessage(): string;

    public handleMessage(sessionId: string, request: ISendMessageRequest): string
    {
        if ((request.text ?? "").length === 0)
        {
            this.logger.error("Command came in as empty text! Invalid data!");
            return request.dialogId;
        }

        const splitCommand = request.text.split(" ");

        const commandos = this.chatCommands.filter((c) => c.getCommandPrefix() === splitCommand[0]);
        if (commandos[0]?.getCommands().has(splitCommand[1]))
        {
            return commandos[0].handle(splitCommand[1], this.getChatBot(), sessionId, request);
        }

        if (splitCommand[0].toLowerCase() === "help")
        {
            const helpMessage = this.chatCommands.map((c) =>
                `Available commands:\n\n${c.getCommandPrefix()}:\n\n${
                    Array.from(c.getCommands()).map((command) => c.getCommandHelp(command)).join("\n")
                }`
            ).join("\n");
            this.mailSendService.sendUserMessageToPlayer(sessionId, this.getChatBot(), helpMessage);
            return request.dialogId;
        }

        this.mailSendService.sendUserMessageToPlayer(
            sessionId,
            this.getChatBot(),
            this.getUnrecognizedCommandMessage(),
        );
    }
}
