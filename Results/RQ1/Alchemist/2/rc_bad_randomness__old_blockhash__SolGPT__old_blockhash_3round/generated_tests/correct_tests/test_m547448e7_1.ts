import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should revert when deploying with more than 1 ether (mutant accepts >= 1 ether, original requires exactly 1 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Attempt to deploy with 2 ether instead of exactly 1 ether
    // The original contract requires msg.value == 1 ether, so this should revert
    // The mutant with >= 1 ether would accept it, so this test kills the mutant
    await expect(
      Factory.deploy({ value: ethers.parseEther("2") })
    ).to.be.reverted;
  });
});