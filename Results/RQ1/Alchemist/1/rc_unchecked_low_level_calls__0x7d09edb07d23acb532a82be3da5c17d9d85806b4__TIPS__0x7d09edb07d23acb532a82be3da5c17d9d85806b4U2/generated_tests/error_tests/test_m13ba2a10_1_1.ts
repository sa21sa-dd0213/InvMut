import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m13ba2a10 - AdjustDifficulty without onlyOwner modifier", function () {
  it("should revert when non-owner calls AdjustDifficulty on original contract, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract with required constructor arguments
    // Constructor: constructor(address whaleAddress, uint256 wagerLimit)
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("1"));
    await instance.waitForDeployment();

    // First, open the contract to public (required by many functions, but not for AdjustDifficulty)
    await instance.connect(owner).OpenToThePublic();

    // Test: non-owner tries to call AdjustDifficulty
    // On original contract with onlyOwner modifier, this should revert
    // On mutant without modifier, this would succeed (kill the mutant)
    await expect(
      instance.connect(addr1).AdjustDifficulty(100)
    ).to.be.revertedWith(""); // Expect revert on original, fail on mutant
  });
});