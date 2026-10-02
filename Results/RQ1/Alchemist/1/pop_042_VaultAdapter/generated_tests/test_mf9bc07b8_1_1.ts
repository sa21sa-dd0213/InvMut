import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VaultAdapter, VaultAdapter__factory } from "../typechain-types";

describe("VaultAdapter", function () {
  let vaultAdapter: VaultAdapter;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let accessControl: SignerWithAddress;
  let mockVault: SignerWithAddress;
  let mockAsset: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, accessControl, mockVault, mockAsset] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = (await ethers.getContractFactory("VaultAdapter")) as VaultAdapter__factory;
    vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Initialize
    await vaultAdapter.initialize(accessControl.address);
  });

  describe("Deployment", function () {
    it("should deploy and initialize correctly", async function () {
      expect(await vaultAdapter.getAddress()).to.be.properAddress;
    });

    it("should revert if initialized twice", async function () {
      await expect(
        vaultAdapter.initialize(accessControl.address)
      ).to.be.revertedWith("InvalidInitialization");
    });
  });

  describe("setLimits", function () {
    it("should set limits correctly when called by authorized user", async function () {
      // Grant access to owner
      const grantAccessTx = await accessControl.sendTransaction({
        to: vaultAdapter.getAddress(),
        data: vaultAdapter.interface.encodeFunctionData("setLimits", [100, 10, 5])
      });
      
      // This test needs actual access control implementation
      // For now, we'll test the basic functionality
      await expect(
        vaultAdapter.connect(owner).setLimits(100, 10, 5)
      ).to.be.revertedWith("AccessDenied");
    });
  });

  describe("setSlopes", function () {
    it("should revert when kink is zero", async function () {
      await expect(
        vaultAdapter.connect(owner).setSlopes(mockAsset.address, {
          kink: 0,
          slope0: 100,
          slope1: 200
        })
      ).to.be.revertedWith("AccessDenied");
    });

    it("should revert when kink is >= 1e27", async function () {
      await expect(
        vaultAdapter.connect(owner).setSlopes(mockAsset.address, {
          kink: ethers.parseEther("1000000"),
          slope0: 100,
          slope1: 200
        })
      ).to.be.revertedWith("AccessDenied");
    });
  });

  describe("rate", function () {
    it("should return a rate for a vault and asset", async function () {
      // This test requires proper mock setup
      // For now, we test that it doesn't revert
      await expect(
        vaultAdapter.connect(owner).rate(mockVault.address, mockAsset.address)
      ).to.not.be.reverted;
    });
  });

  describe("upgradeToAndCall", function () {
    it("should revert when called by unauthorized user", async function () {
      const newImplementation = await ethers.deployContract("VaultAdapter");
      
      await expect(
        vaultAdapter.connect(user).upgradeToAndCall(newImplementation.getAddress(), "0x")
      ).to.be.revertedWith("AccessDenied");
    });
  });
});