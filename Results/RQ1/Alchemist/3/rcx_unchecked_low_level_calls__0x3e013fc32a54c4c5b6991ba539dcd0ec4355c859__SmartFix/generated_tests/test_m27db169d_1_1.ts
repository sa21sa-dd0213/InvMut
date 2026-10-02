import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should detect mutant that uses msg.value-1 instead of msg.value in Command function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract so it has some balance to potentially affect logic
    const fundAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Prepare test data for Command call
    const callAmount = ethers.parseEther("0.5");
    const data = "0x";
    
    // Get balance of target before call
    const targetBalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Execute Command function
    const tx = await instance.connect(owner).Command(addr1.address, data, { value: callAmount });
    await tx.wait();
    
    // Get balance of target after call
    const targetBalanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // Calculate actual amount received
    const actualReceived = targetBalanceAfter - targetBalanceBefore;
    
    // Original would send msg.value (callAmount), mutant sends msg.value-1 (callAmount - 1 wei)
    // Assert that the target received exactly the sent amount (this will fail on mutant)
    expect(actualReceived).to.equal(callAmount);
  });
});