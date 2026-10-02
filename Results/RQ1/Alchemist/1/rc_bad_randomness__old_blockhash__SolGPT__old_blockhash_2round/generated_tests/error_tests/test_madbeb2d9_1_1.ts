import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant madbeb2d9", function () {
  it("should revert when deploying with 0.5 ether (less than 1 ether) in the original contract, but the mutant accepts it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");

    // Try to deploy with only 0.5 ether
    await expect(
      Factory.deploy({ value: ethers.parseEther("0.5") })
    ).to.be.revertedWith(""); // Original reverts; mutant would not revert
  });
});