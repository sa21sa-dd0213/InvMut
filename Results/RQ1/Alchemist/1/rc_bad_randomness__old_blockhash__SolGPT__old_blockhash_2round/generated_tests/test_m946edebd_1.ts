import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant m946edebd by checking payout on correct guess", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Get current block number
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlockNumber = currentBlock.number + 1;
    
    // Calculate the correct hash for the next block
    // Since we need to predict a block hash that hasn't been mined yet,
    // we'll use a two-step approach: lock in a guess, mine a block, then settle
    
    // First, lock in a guess (we'll use a dummy hash for now, then update after mining)
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(player).lockInGuess(dummyHash, { value: ethers.parseEther("1") });
    
    // Mine a block to advance past the target block
    await ethers.provider.send("evm_mine", []);
    
    // Now get the actual block hash of the target block
    const targetBlock = await ethers.provider.getBlock(targetBlockNumber);
    const actualBlockHash = targetBlock.hash;
    
    // We need to lock in the correct guess - but we already locked in with wrong hash
    // This approach won't work directly, so let's use a different strategy:
    // Deploy a new contract and lock in AFTER knowing the future block hash
    // by using a block that's already been mined
    
    // Alternative approach: lock in guess for a block that we'll mine immediately
    const instance2 = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();
    
    // Get the current block number
    const blockBeforeLock = await ethers.provider.getBlock("latest");
    const lockBlockNumber = blockBeforeLock.number;
    
    // Lock in guess - the guess will be for block lockBlockNumber + 1
    await instance2.connect(player).lockInGuess(dummyHash, { value: ethers.parseEther("1") });
    
    // Mine a block
    await ethers.provider.send("evm_mine", []);
    
    // Get the hash of the block that was mined (which is the answer)
    const minedBlock = await ethers.provider.getBlock(lockBlockNumber + 1);
    const correctHash = minedBlock.hash;
    
    // Get player balance before settlement
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Settle - since we locked in with wrong hash, original contract would not pay
    // But mutant would pay because guess != answer
    await instance2.connect(player).settle();
    
    // Get player balance after settlement
    const balanceAfter = await ethers.provider.getBalance(player.address);
    
    // In the original contract, this should NOT increase balance (wrong guess)
    // In the mutant, this SHOULD increase balance (because != condition triggers payout)
    // Since we locked in with wrong hash, the mutant pays out 2 ether
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
  });
});