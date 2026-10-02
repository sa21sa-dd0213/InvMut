import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m000d9c1f", function () {
  it("should fail when sending less than contract balance (mutant always executes transfer)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract with no constructor arguments
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Fund the contract with 10 ETH
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    
    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    expect(initialBalance).to.equal(ethers.parseEther("10"));
    
    // Owner sends only 1 ETH (less than contract balance of 10 ETH)
    // Original would NOT transfer because msg.value < address(this).balance
    // Mutant would ALWAYS transfer, draining the contract
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1")
    });
    await tx.wait();
    
    // Check contract balance after the call
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    
    // In the original: balance stays at 10 ETH (transfer doesn't execute)
    // In the mutant: balance would be 0 ETH (transfer always executes)
    // If finalBalance is 0, the mutant is detected
    expect(finalBalance).to.equal(ethers.parseEther("10"));
  });
});