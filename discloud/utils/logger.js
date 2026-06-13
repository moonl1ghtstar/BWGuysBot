function getFormattedTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}:${month}:${day}:${hours}:${minutes}:${seconds}`;
}

function getInteractionDetails(interaction) {
    // 입력된 모든 옵션(인자)들을 동적으로 포맷팅
    const options = interaction.options.data;
    let optionsStr = '';
    if (options.length > 0) {
        const formatted = options.map(opt => {
            if (opt.user) {
                return `${opt.name}: ${opt.user.tag} (${opt.user.id})`;
            }
            return `${opt.name}: ${opt.value}`;
        }).join(', ');
        optionsStr = ` | Options: [${formatted}]`;
    }

    return optionsStr;
}

module.exports = {
    getFormattedTime,
    logCommand: (interaction) => {
        const time = getFormattedTime();
        const user = interaction.user;
        const commandName = interaction.commandName;
        const details = getInteractionDetails(interaction);
        console.log(`[${time}] [COMMAND] ${user.tag} (${user.id}) used /${commandName}${details}`);
    },
    logSuccess: (interaction) => {
        const time = getFormattedTime();
        const user = interaction.user;
        const commandName = interaction.commandName;
        const details = getInteractionDetails(interaction);
        console.log(`[${time}] [SUCCESS] ${user.tag} (${user.id}) completed /${commandName}${details}`);
    },
    logFailure: (interaction, reason) => {
        const time = getFormattedTime();
        const user = interaction.user;
        const commandName = interaction.commandName;
        const details = getInteractionDetails(interaction);
        console.log(`[${time}] [FAILURE] ${user.tag} (${user.id}) failed /${commandName}${details} | Reason: ${reason}`);
    }
};