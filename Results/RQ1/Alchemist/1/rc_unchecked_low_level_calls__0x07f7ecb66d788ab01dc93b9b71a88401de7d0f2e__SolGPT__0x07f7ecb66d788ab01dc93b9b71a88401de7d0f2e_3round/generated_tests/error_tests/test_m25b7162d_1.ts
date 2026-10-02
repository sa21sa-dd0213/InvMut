import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m25b7162d - AdjustBetAmounts access control", function () {
  it("should revert when non-owner tries to call AdjustBetAmounts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    
    // Deploy with required constructor arguments: whaleAddress, wagerLimit
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("0.1"));
    await instance.waitForDeployment();

    // Attempt to call AdjustBetAmounts from a non-owner address (addr1)
    // In the original contract, this should revert due to onlyOwner modifier
    // In the mutant (which removes onlyOwner), this would succeed
    await expect(
      instance.connect(addr1).AdjustBetAmounts(ethers.parseEther("0.2"))
    ).to.be.reverted;
  });
});