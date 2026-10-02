import { expect } from "chai";
import { ethers } from "hardhat";

describe("B - kill mutant mb4265566 (address(0) instead of real address)", function () {
  it("should send Ether to owner when go() is called with value, but mutant sends to address(0) and owner gets nothing", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for B)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    const ownerInitialBalance = await ethers.provider.getBalance(owner.address);
    const sendAmount = ethers.parseEther("1.0");
    
    // Call go() from addr1 with Ether
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();
    
    const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
    
    // In original contract, owner should receive the full sendAmount
    // In mutant, Ether is sent to address(0) and lost, so owner balance unchanged
    expect(ownerFinalBalance - ownerInitialBalance).to.equal(sendAmount);
  });
});