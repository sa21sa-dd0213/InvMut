import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m02208262 test", function () {
  it("should kill the mutant by verifying that a correct guess receives the 2 ether reward", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess for block number + 1
    const lockTx = await instance.connect(player).lockInGuess(
      ethers.ZeroHash, // any placeholder guess; we'll compute the real answer later
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();

    // Get the block number when the guess was locked
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const targetBlockNumber = lockBlock.number + 1;

    // Mine blocks until the target block is reached
    while ((await ethers.provider.getBlockNumber()) <= targetBlockNumber) {
      await ethers.provider.send("evm_mine", []);
    }

    // Compute the actual answer using the blockhash of the target block
    const targetBlock = await ethers.provider.getBlock(targetBlockNumber);
    const blockHash = targetBlock.hash;
    const answer = ethers.keccak256(
      ethers.solidityPacked(["bytes32"], [blockHash])
    );

    // Re-lock with the correct guess (need to do it again since we used a placeholder)
    // Actually we need to re-deploy or use a different player; simplest: use a new player
    const [player2] = await ethers.getSigners();
    const Factory2 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance2 = await Factory2.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();

    const lockTx2 = await instance2.connect(player2).lockInGuess(answer, {
      value: ethers.parseEther("1"),
    });
    await lockTx2.wait();

    // Mine to the next block after lock
    const lockBlock2 = await ethers.provider.getBlock(lockTx2.blockNumber);
    const targetBlockNumber2 = lockBlock2.number + 1;
    while ((await ethers.provider.getBlockNumber()) <= targetBlockNumber2) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get balance before settle
    const balanceBefore = await ethers.provider.getBalance(player2.address);

    // Settle
    const settleTx = await instance2.connect(player2).settle();
    await settleTx.wait();

    // Check balance increased by 2 ether
    const balanceAfter = await ethers.provider.getBalance(player2.address);
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
  });
});