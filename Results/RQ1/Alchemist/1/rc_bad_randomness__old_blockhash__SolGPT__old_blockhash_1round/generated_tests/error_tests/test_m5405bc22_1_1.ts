import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant m5405bc22 by settling one block earlier than allowed", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();
    
    // Get the block where the guess was locked
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const lockBlockNumber = lockBlock.number;
    
    // Mine one more block to reach block.number = lockBlockNumber + 1
    await ethers.provider.send("evm_mine", []);
    
    // Now block.number = lockBlockNumber + 1
    // Original contract: require(block.number > guesses[msg.sender].block)
    //   where guesses[msg.sender].block = lockBlockNumber + 1
    //   block.number (lockBlockNumber + 1) is NOT greater than (lockBlockNumber + 1) => REVERTS
    // Mutant: require(block.number + 1 > guesses[msg.sender].block)
    //   block.number + 1 = lockBlockNumber + 2 > lockBlockNumber + 1 => PASSES
    
    // The settle should revert in original but pass in mutant (killing the mutant)
    await expect(instance.connect(player).settle()).to.be.reverted;
  });
});