import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant me6c1fa87 - _authorizeUpgrade onlyOwner modifier", function () {
  it("should revert when non-owner tries to upgrade implementation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor has no arguments as it's a UUPS proxy pattern)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock implementation to upgrade to (any contract with proxiableUUID will do)
    const MockImplementation = await ethers.getContractFactory("PhiNFT1155");
    const newImplementation = await MockImplementation.deploy();
    await newImplementation.waitForDeployment();
    
    // Attempt upgrade from non-owner address - should revert with OwnableUnauthorizedAccount
    await expect(
      instance.connect(addr1).upgradeToAndCall(
        await newImplementation.getAddress(),
        "0x"
      )
    ).to.be.revertedWithCustomError(instance, "OwnableUnauthorizedAccount")
      .withArgs(addr1.address);
  });
});