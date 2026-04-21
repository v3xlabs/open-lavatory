{
  description = "safe-wallet with OpenLV integration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }: let
    upstreamRepo = "https://github.com/safe-global/safe-wallet-monorepo";
    upstreamCommit = "046d549eb66c18aad5f43e56bfb8a8920cec18aa";
    upstreamBranch = "release";
  in
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.default = pkgs.mkShell {
        packages = [ pkgs.git pkgs.nodejs_20 pkgs.yarn pkgs.cocoapods ];
        shellHook = ''
          if [ ! -d .repo ]; then
            git clone ${upstreamRepo} .repo
            git -C .repo checkout ${upstreamCommit}
            for patch in $(find patches -name "*.patch" | sort); do
              git -C .repo apply "$patch"
            done
            sed 's/APP_VARIANT=production/APP_VARIANT=development/;s/EXPO_PUBLIC_APP_VARIANT=production/EXPO_PUBLIC_APP_VARIANT=development/' \
              .repo/apps/mobile/.env.example > .repo/apps/mobile/.env.local
            (cd .repo/apps/mobile && yarn install)
          fi
          echo "cd .repo/apps/mobile && yarn ios"
        '';
      };
    });
}
