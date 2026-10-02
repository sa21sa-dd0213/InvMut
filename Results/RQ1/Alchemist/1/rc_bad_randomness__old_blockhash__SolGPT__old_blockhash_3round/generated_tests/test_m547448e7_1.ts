import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection (m547448e7)", function () {
  it("should revert when deploying with exactly 1 ether (original behavior), but mutant allows >= 1 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy with exactly 1 ether - should pass on original, but we want to confirm mutant allows more
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Now deploy with 2 ether (more than 1) - this should revert on original contract
    // but succeed on mutant since mutant requires >= 1 ether
    await expect(
      Factory.deploy({ value: ethers.parseEther("2") })
    ).to.be.reverted;
  });
});