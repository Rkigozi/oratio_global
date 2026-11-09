module.exports = ({ config }) => {
  const gitSha = process.env.EAS_BUILD_GIT_COMMIT_HASH || process.env.EXPO_PUBLIC_GIT_SHA;
  return {
    ...config,
    extra: {
      ...config.extra,
      monitoring: { gitSha: /^[a-f0-9]{40}$/.test(gitSha || '') ? gitSha : undefined },
    },
  };
};
