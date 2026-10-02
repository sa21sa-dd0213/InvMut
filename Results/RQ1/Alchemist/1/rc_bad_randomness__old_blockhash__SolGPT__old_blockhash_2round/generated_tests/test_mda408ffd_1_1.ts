import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection - constructor value check", function () {
  it("should revert when deploying with more than 1 ether (original behavior), but mutant would accept it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");

    // Try to deploy with 2 ether (more than the required 1 ether)
    // Original contract requires msg.value == 1 ether, so this should revert
    // Mutant uses msg.value >= 1 ether, so this would succeed
    await expect(
      Factory.deploy({ value: ethers.parseEther("2") })
    ).to.be.reverted;
  });
});