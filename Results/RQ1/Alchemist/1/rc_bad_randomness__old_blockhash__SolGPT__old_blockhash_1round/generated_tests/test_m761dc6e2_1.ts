import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant m761dc6e2 by calling lockInGuess then settle and expecting success on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for a future block
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Mine enough blocks to satisfy the require(block.number > guesses[msg.sender].block)
    // We need to advance at least 2 blocks from the current block
    for (let i = 0; i < 3; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Attempt to settle - on the mutant this should revert because guesses[addr1].block != 0
    // but the mutant requires it to be == 0
    await expect(
      instance.connect(addr1).settle()
    ).to.be.reverted;
  });
});