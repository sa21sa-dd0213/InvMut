import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m8352f4ad", function () {
  it("should detect mutant that replaces winning condition with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance (not needed but safe)
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Send 10 ether from addr1 - this will set pastBlockTime and trigger potential payout
    const tx1 = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block number of the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const blockNum1 = block1.number;

    // Mine blocks until we are at a block where block.number % 15 == 0
    // This ensures the next call should trigger the payout in the original contract
    const targetBlock = blockNum1 + (15 - (blockNum1 % 15));
    while ((await ethers.provider.getBlock("latest")).number < targetBlock - 1) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get contract balance before second transaction
    const balanceBefore = await ethers.provider.getBalance(contractAddress);

    // Send another 10 ether - in original contract this should trigger payout
    // In mutant it never triggers, so balance increases
    const tx2 = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    // Get contract balance after second transaction
    const balanceAfter = await ethers.provider.getBalance(contractAddress);

    // In original contract, the payout would transfer all balance to msg.sender
    // So balance after should be less than or equal to the initial 10 ether (since 10 was sent, then all transferred out)
    // In mutant, payout never happens, so balance should be 20 ether (10 initial + 10 new)
    // We expect the balance to be 0 (original behavior) - if it's 20, the mutant is detected
    expect(balanceAfter).to.equal(ethers.parseEther("0"));
  });
});