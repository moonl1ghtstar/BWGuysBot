function getHighestColoredRole(member) {
    if (!member) return null;

    return member.roles.cache
        .filter(role => role.id !== member.guild.id && role.color !== 0)
        .sort((a, b) => b.position - a.position)
        .first() || null;
}

function isTargetAtOrAboveModerator(targetMember, moderatorMember) {
    const targetRole = getHighestColoredRole(targetMember);
    const moderatorRole = getHighestColoredRole(moderatorMember);

    if (!targetRole) return false;
    if (!moderatorRole) return true;

    return targetRole.position >= moderatorRole.position;
}

module.exports = {
    getHighestColoredRole,
    isTargetAtOrAboveModerator,
};
