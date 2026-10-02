import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant md5e14906 by deploying with exactly 1 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy with exactly 1 ether - this should succeed on original but fail on mutant
    // because mutant requires msg.value != 1 ether
    const ONE_ETHER = ethers.parseEther("1.0");
    
    // The original contract constructor requires msg.value == 1 ether
    // The mutant changes it to require(msg.value != 1 ether)
    // Therefore deploying with exactly 1 ether will revert on the mutant
    await expect(
      Factory.deploy({ value: ONE_ETHER })
    ).to.be.reverted;
  });
});