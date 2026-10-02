import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m9aef3487 test", function () {
  it("should kill mutant by settling exactly one block after lockInGuess (original should succeed, mutant should revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // addr1 locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();

    // Get the block number when the guess was locked
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const guessBlockNumber = lockBlock!.number;

    // Mine a new block so we are exactly at block guessBlockNumber + 1
    await ethers.provider.send("evm_mine", []);

    // Verify we are now at the next block
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock!.number).to.equal(guessBlockNumber + 1);

    // Attempt to settle - should revert on mutant because block.number-1 > guessBlockNumber
    // is false (block.number-1 = guessBlockNumber, not greater)
    await expect(
      instance.connect(addr1).settle()
    ).to.be.reverted;
  });
});