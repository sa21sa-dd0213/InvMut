import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m0590d68f", function () {
  it("should revert when msg.value equals contract balance (mutant uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so it has a balance
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get the contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly the contract balance as msg.value to multiplicate
    // Original: if(msg.value >= balance) -> true, transfers
    // Mutant: if(msg.value > balance) -> false, no transfer
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    const tx = await instance.connect(addr1).multiplicate(addr1.address, { 
      value: contractBalance 
    });
    await tx.wait();

    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // If mutant is present, no transfer occurs, so addr1 balance stays the same
    // If original code, addr1 would receive the contract balance + msg.value = 2 * contractBalance
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore);
  });
});