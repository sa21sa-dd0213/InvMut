import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - constructor value check", function () {
  it("should revert when deploying with less than 1 ether, killing the mutant that uses <=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy with only 0.5 ether - this should revert on original (requires == 1 ether)
    // but would succeed on mutant (requires <= 1 ether)
    await expect(
      Factory.deploy({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});