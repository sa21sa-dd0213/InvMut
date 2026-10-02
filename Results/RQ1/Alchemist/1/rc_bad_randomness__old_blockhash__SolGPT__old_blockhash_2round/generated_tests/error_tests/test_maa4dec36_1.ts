import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant maa4dec36 test", function () {
  it("should kill mutant by exploiting block.number - 1 in lockInGuess", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attacker locks in guess with 1 ETH
    const lockTx = await instance.connect(attacker).lockInGuess(
      ethers.keccak256(ethers.toUtf8Bytes("any guess")),
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();

    // With mutant, guesses[attacker].block = block.number - 1
    // So settle can be called immediately (block.number > block.number - 1 is true)
    // blockhash(block.number - 1) is known, so attacker can compute correct guess
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlockNumber = currentBlock.number - 1;
    const blockHash = (await ethers.provider.getBlock(targetBlockNumber)).hash;
    const correctAnswer = ethers.keccak256(
      ethers.concat([
        ethers.toBeArray(blockHash)
      ])
    );

    // Attacker re-locks with correct answer
    const lockTx2 = await instance.connect(attacker).lockInGuess(
      correctAnswer,
      { value: ethers.parseEther("1") }
    );
    await lockTx2.wait();

    // Settle immediately - should succeed on mutant, fail on original
    const settleTx = await instance.connect(attacker).settle();
    await settleTx.wait();

    // Check that attacker received 2 ETH
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.be.lt(ethers.parseEther("1"));
  });
});