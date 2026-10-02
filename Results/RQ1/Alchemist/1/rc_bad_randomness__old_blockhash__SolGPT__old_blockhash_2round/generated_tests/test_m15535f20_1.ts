import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m15535f20", function () {
  it("should revert when deploying with exactly 1 ether because mutant requires 2 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The original requires msg.value == 1 ether, but the mutant changes it to msg.value - 1 == 1 ether (i.e., msg.value == 2 ether)
    // Deploying with exactly 1 ether should succeed on original but revert on mutant
    await expect(
      Factory.deploy({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });

  it("should deploy successfully with 2 ether on the mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The mutant requires msg.value - 1 == 1 ether, which means msg.value == 2 ether
    const instance = await Factory.deploy({ value: ethers.parseEther("2") });
    await instance.waitForDeployment();
    
    expect(await instance.getAddress()).to.be.properAddress;
  });
});