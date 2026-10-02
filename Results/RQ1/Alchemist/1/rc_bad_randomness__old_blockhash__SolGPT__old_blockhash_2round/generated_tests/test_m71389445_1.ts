import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant that changes block.number to block.number+1 in settle()", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether initial balance
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test guess"));
    const lockTx = await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();
    
    // Get the block where the guess was locked
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const guessedBlockNumber = lockBlock.number + 1;
    
    // Mine one block so we're at the exact guessed block number
    await ethers.provider.send("evm_mine", []);
    
    // Verify we're at the guessed block number
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock.number).to.equal(guessedBlockNumber);
    
    // Attempt to settle - should revert on original but pass on mutant
    // The mutant allows settlement when block.number == guesses[msg.sender].block
    // because it checks block.number+1 > block.number instead of block.number > block.number
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});