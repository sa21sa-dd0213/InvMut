import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
    it("should kill mutant m9e615f4a by exploiting same-block settlement", async function () {
        const [owner, player] = await ethers.getSigners();
        
        // Deploy contract with 1 ether
        const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
        const instance = await Factory.deploy({ value: ethers.parseEther("1") });
        await instance.waitForDeployment();
        
        // Player locks in a guess with 1 ether
        const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
        const txLock = await instance.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });
        await txLock.wait();
        
        // Try to settle in the same block - should fail on original but pass on mutant
        // Mutant stores block.number instead of block.number + 1, so condition block.number > stored block fails
        // but in mutant, stored block = current block, so block.number > current block is false -> should revert
        await expect(instance.connect(player).settle()).to.be.reverted;
        
        // Now mine a new block
        await ethers.provider.send("evm_mine");
        
        // Settle in the next block - original works, mutant produces wrong answer
        const txSettle = await instance.connect(player).settle();
        await txSettle.wait();
        
        // Verify the player got the reward (2 ether) in original, but not in mutant
        const balance = await ethers.provider.getBalance(player.address);
        // Player initially had 1 ether (from hardhat default) + 1 ether sent to lock - 1 ether spent = still has 1 ether
        // Then should receive 2 ether if guess was correct
        expect(balance).to.equal(ethers.parseEther("102")); // 100 initial + 2 reward
    });
});