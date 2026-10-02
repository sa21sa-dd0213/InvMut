import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should revert when settling with an incorrect guess in the original contract, but pass (incorrectly) in the mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in an obviously incorrect guess (bytes32(0))
    const incorrectGuess = ethers.ZeroHash;
    const tx1 = await instance.connect(player).lockInGuess(incorrectGuess, {
      value: ethers.parseEther("1")
    });
    await tx1.wait();
    
    // Mine blocks to advance past the target block
    const targetBlock = (await ethers.provider.getBlock("latest")).number + 1;
    for (let i = 0; i < 3; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Get player balance before settlement
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Try to settle - should revert in original because guess is wrong (transfer condition fails)
    // But in mutant, it would succeed since condition is always true
    const tx2 = await instance.connect(player).settle();
    await tx2.wait();
    
    // Check balance - in original contract, no transfer happens because guess was wrong
    // In mutant, transfer would happen incorrectly
    const balanceAfter = await ethers.provider.getBalance(player.address);
    const gasCost = (await ethers.provider.getTransactionReceipt(tx2.hash)).gasUsed * 
                   (await ethers.provider.getTransaction(tx2.hash)).maxFeePerGas;
    
    // Original: balance should decrease by gas cost only (no transfer)
    // Mutant: balance would increase by 2 ether minus gas cost
    expect(balanceAfter).to.be.lessThanOrEqual(balanceBefore);
    expect(balanceAfter).to.be.closeTo(
      balanceBefore - gasCost,
      ethers.parseEther("0.001")
    );
  });
});