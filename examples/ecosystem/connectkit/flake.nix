{
  description = "connectkit with OpenLV integration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }: let
    upstreamRepo = "https://github.com/family/connectkit";
    upstreamCommit = "cf8a1e2f9c36cf9fdc5fed280c9a7db103dcce78";
    upstreamBranch = "release/v1.9.1";
  in
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.default = pkgs.mkShell {
        packages = [ pkgs.git pkgs.nodejs_20 pkgs.yarn ];
        shellHook = ''
          if [ ! -d .repo ]; then
            git clone ${upstreamRepo} .repo
            git -C .repo checkout ${upstreamCommit}
            for patch in $(find patches -name "*.patch" | sort); do
              git -C .repo apply "$patch"
            done
            (cd .repo && yarn install)
          fi
          echo "cd .repo/examples/vite && yarn dev"
        '';
      };
    });
}
