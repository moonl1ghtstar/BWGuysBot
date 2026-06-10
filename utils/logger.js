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

module.exports = {
    logCommand: (interaction) => {
        const time = getFormattedTime();
        const user = interaction.user;
        const commandName = interaction.commandName;
        
        // 대상(target) 옵션이 있는 경우 가져오기
        const target = interaction.options.getUser('대상') || interaction.options.getUser('target');
        const targetInfo = target ? ` target ${target.tag} (${target.id})` : '';
        
        console.log(`[${time}] ${user.tag} (${user.id}) used ${commandName}${targetInfo}`);
    }
};
