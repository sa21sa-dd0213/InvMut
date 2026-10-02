import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should revert when settle is called in the same block as lockInGuess (original contract) but succeed on mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Try to settle immediately in the same block - should revert in original, pass in mutant
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});