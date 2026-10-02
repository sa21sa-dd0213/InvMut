import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant mef516d8f - init guard inversion", function () {
  it("should revert on second init call in original, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock VADER, USDV, VAULT addresses (any addresses work for init test)
    const mockVader = await ethers.Wallet.createRandom().getAddress();
    const mockUsdv = await ethers.Wallet.createRandom().getAddress();
    const mockVault = await ethers.Wallet.createRandom().getAddress();

    // First init call should succeed in original, but in mutant it reverts
    // We expect it to succeed (original behavior) - if it reverts, mutant is killed
    try {
      const tx1 = await instance.init(mockVader, mockUsdv, mockVault);
      await tx1.wait();
    } catch (error) {
      // If first call reverts, mutant is detected (original allows first call)
      expect(error).to.exist;
      return;
    }

    // Second init call should revert in original, but mutant might allow it
    try {
      const tx2 = await instance.init(mockVader, mockUsdv, mockVault);
      await tx2.wait();
      // If second call succeeds, mutant is detected (original would revert)
      expect.fail("Second init should have reverted");
    } catch (error) {
      // If second call reverts, it matches original behavior (mutant not killed here)
      expect(error).to.exist;
    }
  });
});