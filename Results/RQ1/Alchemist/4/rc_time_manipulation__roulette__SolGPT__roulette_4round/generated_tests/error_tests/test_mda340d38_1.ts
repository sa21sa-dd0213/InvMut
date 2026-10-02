import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should NOT send balance when block number is not multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Get current block number
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // Ensure we're not on a block that is multiple of 15
    const blocksToWait = (15 - (currentBlock % 15)) + 1; // Move to a non-multiple block
    
    // Mine blocks to get to a non-multiple of 15 block
    for (let i = 0; i < blocksToWait; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we're not on a multiple of 15
    const newBlock = await ethers.provider.getBlockNumber();
    expect(newBlock % 15).to.not.equal(0);

    // Send 10 ether to trigger fallback
    const tx = await addr1.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that addr1 did NOT receive the contract balance
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    
    // On original contract: addr1 should have spent 10 ether, but not received contract balance
    // On mutant: addr1 would receive the contract balance (20 ether total)
    expect(finalBalance).to.be.lessThan(initialBalance); // Should have lost 10 ether
    expect(finalBalance).to.equal(initialBalance - ethers.parseEther("10")); // Exact loss
  });
});