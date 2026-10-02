import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect constructor mutant that changes == to !=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Original contract requires msg.value == 1 ether, mutant requires msg.value != 1 ether
    // Deploy with exactly 1 ether - should succeed on original but fail on mutant
    await expect(
      Factory.deploy({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});