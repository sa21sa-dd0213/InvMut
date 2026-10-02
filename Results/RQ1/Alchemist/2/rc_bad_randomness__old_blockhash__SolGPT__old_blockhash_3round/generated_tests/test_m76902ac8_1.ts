import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - constructor value check", function () {
  it("should revert when deploying with less than 1 ether (mutant allows <= instead of ==)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");

    // The mutant constructor allows msg.value <= 1 ether instead of == 1 ether.
    // Deploy with 0.5 ether - this should revert on the original but succeed on the mutant.
    // We expect revert to kill the mutant, because the mutant would not revert.
    await expect(
      Factory.deploy({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});