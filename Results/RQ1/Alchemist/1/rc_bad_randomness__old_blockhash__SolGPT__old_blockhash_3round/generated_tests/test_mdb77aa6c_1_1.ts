import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mdb77aa6c test", function () {
  it("should kill mutant by locking in a guess and settling after the target block, expecting reward transfer to succeed only if blockhash of stored block is used", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for the next block (block.number + 1)
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1;

    // Get the blockhash of the target block (must wait for it to be mined)
    const txLock = await instance.connect(addr1).lockInGuess(
      ethers.ZeroHash, // placeholder guess, we'll use actual blockhash later
      { value: ethers.parseEther("1") }
    );
    await txLock.wait();

    // Mine one more block so we can settle (block.number > targetBlock)
    await ethers.provider.send("evm_mine", []);

    // Get the actual blockhash of the target block
    const targetBlockHash = (await ethers.provider.getBlock(targetBlock))!.hash;

    // We need to re-lock with the correct guess since we used ZeroHash
    // First, deploy a new instance to reset state
    const instance2 = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();

    // Lock in with the actual blockhash as the guess
    const txLock2 = await instance2.connect(addr1).lockInGuess(
      targetBlockHash,
      { value: ethers.parseEther("1") }
    );
    await txLock2.wait();

    // Mine past the target block
    await ethers.provider.send("evm_mine", []);

    // Check balance before settle
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Settle the guess
    const txSettle = await instance2.connect(addr1).settle();
    await txSettle.wait();

    // Check balance after settle - should have increased by 2 ether if blockhash was correct
    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // In the original contract, this should succeed (balance increases by 2 ether)
    // In the mutant, blockhash(block.prevrandao) is used instead of blockhash(targetBlock),
    // so the guess won't match and no transfer occurs (balance unchanged)
    // This difference kills the mutant
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});