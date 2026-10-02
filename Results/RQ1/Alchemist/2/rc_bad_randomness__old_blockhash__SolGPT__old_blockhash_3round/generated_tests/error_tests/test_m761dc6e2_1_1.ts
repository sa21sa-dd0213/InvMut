import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m761dc6e2 by testing that settle reverts when block == 0 is required", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const contract = await Factory.deploy({ value: ethers.parseEther("1") });
    await contract.waitForDeployment();
    
    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await contract.connect(player).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();
    
    // Get the block number where guess was locked
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const targetBlock = lockBlock.number + 1;
    
    // Mine enough blocks to surpass the target block
    await ethers.provider.send("hardhat_mine", [ethers.toQuantity(2)]);
    
    // Now try to settle - should revert because the mutant requires guesses[msg.sender].block == 0
    // but the player's block is set to a non-zero value from lockInGuess
    await expect(
      contract.connect(player).settle()
    ).to.be.reverted;
  });
});