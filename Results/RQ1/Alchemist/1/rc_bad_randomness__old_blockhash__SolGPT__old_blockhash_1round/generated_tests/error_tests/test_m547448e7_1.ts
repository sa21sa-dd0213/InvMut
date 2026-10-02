import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m547448e7", function () {
  it("should revert when deploying with exactly 1 ether (original behavior) - mutant allows >= so deploy with 2 ether should succeed when it should revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy with 2 ether - should revert on original but succeed on mutant
    const tx = Factory.deploy({ value: ethers.parseEther("2") });
    await expect(tx).to.be.revertedWith(""); // Original reverts, mutant passes => test kills mutant
  });
});