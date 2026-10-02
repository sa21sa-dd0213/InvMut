import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant test - AdjustDifficulty event emission", function () {
  it("should emit DifficultyChanged event when AdjustDifficulty is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Set a new difficulty value
    const newDifficulty = 10;
    
    // Call AdjustDifficulty and expect the DifficultyChanged event to be emitted
    await expect(instance.connect(owner).AdjustDifficulty(newDifficulty))
      .to.emit(instance, "DifficultyChanged")
      .withArgs(newDifficulty);
  });
});