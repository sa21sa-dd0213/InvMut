import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m3fbb7d21 - DifficultyChanged event emission", function () {
  it("should emit DifficultyChanged when AdjustDifficulty is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    
    // Constructor requires: whaleAddress, wagerLimit
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // First open to public to enable other functions if needed, but AdjustDifficulty only needs owner
    // Call AdjustDifficulty with a new difficulty value
    const newDifficulty = 10;
    
    // Expect the DifficultyChanged event to be emitted with the new difficulty value
    await expect(instance.AdjustDifficulty(newDifficulty))
      .to.emit(instance, "DifficultyChanged")
      .withArgs(newDifficulty);
  });
});