import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - mda340d38", function () {
  it("should not payout when block.number % 15 != 0 (original passes, mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (constructor is payable, but no arguments needed)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with 10 ether
    const fundingTx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await fundingTx.wait();

    // Get current block number to ensure we can mine to a non-payout block
    let blockNum = await ethers.provider.getBlockNumber();
    
    // Mine to a block where block.number % 15 != 0
    while (blockNum % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      blockNum = await ethers.provider.getBlockNumber();
    }

    // Record balance of addr1 before call
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);

    // Send exactly 10 ether from addr1 to trigger fallback
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check contract balance - should remain the same if no payout happened
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // On original: contract balance stays same (no payout)
    // On mutant: contract balance drops to 0 (payout happens incorrectly)
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});