import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff", function () {
  it("should detect mutant that changes block.number to block.number-1 in payout condition", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy Roulette (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance to make transfer possible
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("20")
    });
    await fundTx.wait();
    
    // Get current block number and calculate the next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock!.number;
    const blocksUntilMultiple = (15 - (currentBlockNumber % 15)) % 15;
    const targetBlockNumber = currentBlockNumber + blocksUntilMultiple;
    
    // Mine blocks to reach a block number that is a multiple of 15
    if (blocksUntilMultiple > 0) {
      for (let i = 0; i < blocksUntilMultiple; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }
    
    // Verify we're at the right block
    const verifiedBlock = await ethers.provider.getBlock("latest");
    expect(verifiedBlock!.number % 15).to.equal(0);
    
    // Record contract balance before
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Player sends exactly 10 ether to trigger fallback
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check if payout occurred - the contract should have transferred its balance
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    // In the original: contract balance should be 0 (all sent to player)
    // In the mutant: contract balance remains unchanged (no transfer at block.number == 1)
    // The player should have received the contract's full balance (20 + 10 = 30 ether) in original
    const expectedPlayerIncrease = ethers.parseEther("30"); // 20 initial + 10 just sent
    const actualPlayerIncrease = playerBalanceAfter - playerBalanceBefore;
    
    // If mutant is present, player only loses gas (no payout)
    // If original, player gains ~30 ether minus gas
    // We detect the mutant by checking contract is not empty
    expect(contractBalanceAfter).to.equal(0n, "Contract should be empty after payout in original, but mutant leaves balance");
  });
});