import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection", function () {
  it("should detect mutant m319414ab where Deposit adds msg.value-1 instead of msg.value", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required for Deposit to work properly)
    await instance.connect(owner).Initialized();
    
    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("1");
    const tx = await instance.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check the recorded balance - mutant would store msg.value-1 = 1 ether - 1 wei
    const recordedBalance = await instance.balances(depositor.address);
    expect(recordedBalance).to.equal(depositAmount);
  });
});