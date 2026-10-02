import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m134e3ba3 test", function () {
  it("should revert deployment when sending exactly 1 ether due to mutant != check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The mutant changes require(msg.value == 1 ether) to require(msg.value != 1 ether)
    // So deploying with exactly 1 ether should revert (mutant expects value != 1 ether)
    await expect(
      Factory.deploy({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});