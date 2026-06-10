const { Events, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        // 명령어 실행 로그 기록
        logger.logCommand(interaction);

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            // 시스템 오류 로그 기록
            logger.logFailure(interaction, `시스템 오류: ${error.message}`);
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 오류 발생')
                .setColor(0xFF0000)
                .setDescription('> 명령어를 실행하는 도중 예기치 못한 오류가 발생했습니다.')
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },
};

'Made By Astral Interactive'