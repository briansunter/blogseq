module.exports = {
  branches: ["master"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        writerOpts: {
          commitsSort: ["subject", "scope"],
          transform: (commit) => {
            // Shorten commit hash for display
            if (commit.hash) {
              commit.shortHash = commit.hash.substring(0, 7);
            }
            return commit;
          }
        }
      }
    ],
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: true,
      },
    ],
    "@semantic-release/git",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "zip -qq -r blogseq-${nextRelease.version}.zip dist readme.md logo.svg LICENSE package.json",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: "blogseq-*.zip",
      },
    ],
  ],
};
