import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m5d93fc25 - pause without onlyOwner modifier", function () {
  it("should revert when non-owner tries to pause the contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const instanceAsNonOwner = instance.connect(addr1);
    
    await expect(instanceAsNonOwner.pause()).to.be.revertedWithCustomError(
      instance,
      "OwnableUnauthorizedAccount"
    );
  });
});