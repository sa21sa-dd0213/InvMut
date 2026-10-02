import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant m59dd3a49 by locking in a guess for the next block and settling immediately after one block", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess for the next block (block.number + 1)
    const lockTx = await instance.connect(player).lockInGuess(
      ethers.ZeroHash,
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();

    // Mine exactly one block to reach the target block
    await ethers.provider.send("evm_mine", []);

    // Settle should succeed on original but fail on mutant
    // On original: target block = block.number + 1, we mined one block so answer matches
    // On mutant: target block = block.number + 2, so answer won't match and no transfer
    const settleTx = await instance.connect(player).settle();
    const receipt = await settleTx.wait();

    // Check player received 2 ether on original (but not on mutant)
    const playerBalance = await ethers.provider.getBalance(player.address);
    expect(playerBalance).to.be.gt(ethers.parseEther("10000")); // Player started with >10000, should gain 2 on original

    // Also verify the guess was cleared
    const [guessBlock, guessHash] = await instance.guesses(player.address);
    expect(guessBlock).to.equal(0);
  });
});