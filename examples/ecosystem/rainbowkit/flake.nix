{
  description = "rainbowkit with OpenLV integration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }: let
    upstreamRepo = "https://github.com/rainbow-me/rainbowkit";
    upstreamCommit = "8409eaa95545d6b698ee51d4441c2a77718294c7";
    upstreamBranch = "main";
  in
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.default = pkgs.mkShell {
        packages = [ pkgs.git pkgs.nodejs_24 pkgs.pnpm ];
        shellHook = ''
          if [ -n "$CI" ] && [ -d .repo ]; then
            rm -rf .repo
          fi
          if [ ! -d .repo ]; then
            git clone ${upstreamRepo} .repo
            git -C .repo checkout ${upstreamCommit}
            for patch in $(find patches -name "*.patch" | sort); do
              git -C .repo apply "../$patch"
            done
            (cd .repo && pnpm install --no-frozen-lockfile)
          fi
          echo "cd .repo/examples/with-vite && pnpm dev"
        '';
      };
    });
}
