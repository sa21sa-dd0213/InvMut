import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant mbfce8099", function () {
  it("should revert when settling at the exact block number (original) but succeed on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Get current block number
    const currentBlock = await ethers.provider.getBlockNumber();

    // Lock in a guess for the next block
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(attacker).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine a block to advance to the target block
    await ethers.provider.send("evm_mine", []);
    const targetBlock = currentBlock + 1;

    // Verify we are at the exact target block
    const currentBlockAfter = await ethers.provider.getBlockNumber();
    expect(currentBlockAfter).to.equal(targetBlock);

    // Attempt to settle at the exact block - should revert on original (due to >)
    // but will pass on mutant (due to >=)
    await expect(
      instance.connect(attacker).settle()
    ).to.be.reverted;
  });
});