import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant m9aef3487 by settling exactly one block after lockInGuess", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for the next block
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(owner).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine one block so that block.number == targetBlock + 1
    await ethers.provider.send("evm_mine", []);

    // This should succeed on original but revert on mutant
    await expect(instance.connect(owner).settle()).to.not.be.reverted;
  });
});