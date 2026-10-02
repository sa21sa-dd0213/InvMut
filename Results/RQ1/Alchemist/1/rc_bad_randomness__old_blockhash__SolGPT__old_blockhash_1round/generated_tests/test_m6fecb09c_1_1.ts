import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant m6fecb09c by locking in a guess smaller than actual blockhash and expecting revert on settle", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess of zero (which will be <= any non-zero blockhash)
    await instance.connect(player).lockInGuess(
      ethers.ZeroHash,
      { value: ethers.parseEther("1") }
    );

    // Mine a block to advance past the target block
    await ethers.provider.send("evm_mine", []);

    // In the original contract, this should revert because 0 != actual blockhash
    // In the mutant, the condition 0 <= blockhash is true, so it would pay out - killing the mutant
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});