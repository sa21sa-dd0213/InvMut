import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test - me32ed05a", function () {
  it("should emit BetLimitChanged event when AdjustBetAmounts is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open the contract to the public first (required for some operations)
    await instance.connect(owner).OpenToThePublic();
    
    // Set a new bet limit
    const newBetLimit = ethers.parseEther("2");
    
    // Call AdjustBetAmounts and expect the BetLimitChanged event
    await expect(instance.connect(owner).AdjustBetAmounts(newBetLimit))
      .to.emit(instance, "BetLimitChanged")
      .withArgs(newBetLimit);
  });
});