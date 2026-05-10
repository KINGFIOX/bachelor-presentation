{
  description = "Bachelor presentation built with reveal.js";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "bachelor-presentation";

          packages = with pkgs; [
            nodejs_22
          ];

          shellHook = ''
            echo "reveal.js dev shell"
            echo "  node $(node --version)"
            echo "  npm  $(npm --version)"
            echo ""
            echo "Run 'npm install' once, then 'npm start' to launch the dev server."
          '';
        };
      }
    );
}
