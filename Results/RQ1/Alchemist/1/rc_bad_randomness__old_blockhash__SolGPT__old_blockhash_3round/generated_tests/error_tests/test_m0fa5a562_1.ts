import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m0fa5a562 test", function () {
  it("should detect sha256 mutation by verifying keccak256-based reward distribution", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess with 1 ether
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1;
    
    // Compute the correct answer using keccak256 (original contract logic)
    const blockHash = await ethers.provider.getBlock(targetBlock);
    const correctAnswer = ethers.keccak256(
      ethers.solidityPacked(["bytes32"], [blockHash.hash])
    );
    
    // Player locks in the correct guess
    await instance.connect(player).lockInGuess(correctAnswer, {
      value: ethers.parseEther("1")
    });
    
    // Mine to the next block
    await ethers.provider.send("evm_mine", []);
    
    // Wait for target block to be confirmed (block.number > guesses[player].block)
    while ((await ethers.provider.getBlockNumber()) <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Get player balance before settlement
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Settle the guess
    const tx = await instance.connect(player).settle();
    const receipt = await tx.wait();
    
    // Get player balance after settlement
    const balanceAfter = await ethers.provider.getBalance(player.address);
    
    // In the original contract, player should receive 2 ether reward
    // In the mutant using sha256, the computed answer will differ and reward won't be sent
    // This test will pass on original (balance increases by ~2 ether) and fail on mutant (balance unchanged)
    expect(balanceAfter - balanceBefore).to.be.gt(ethers.parseEther("1.9"));
  });
});