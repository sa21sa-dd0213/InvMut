import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m0824b824 - onlyOwner modifier", function () {
  it("should revert when non-owner calls AdjustBetAmounts if onlyOwner modifier works correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = owner.address; // Using owner as whale for simplicity
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public (required for some functions but not for AdjustBetAmounts)
    await instance.connect(owner).OpenToThePublic();
    
    // Attempt to call AdjustBetAmounts from a non-owner address
    // The original contract should revert because addr1 is not the owner
    // The mutant will allow the call to succeed because the require statement is removed
    await expect(
      instance.connect(addr1).AdjustBetAmounts(ethers.parseEther("2"))
    ).to.be.reverted;
  });
});