import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should revert when settle is called in the same block as lockInGuess (mutant removal of block.number check)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(attacker).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Attempt to settle in the same block - original contract reverts, mutant does not
    // Since we're in the same block, block.number is not > guesses[msg.sender].block
    await expect(
      instance.connect(attacker).settle()
    ).to.be.reverted;
  });
});