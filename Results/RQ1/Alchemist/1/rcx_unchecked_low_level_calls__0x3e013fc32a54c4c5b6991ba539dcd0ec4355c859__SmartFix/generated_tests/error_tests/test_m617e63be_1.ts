import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m617e63be", function () {
  it("should not transfer when msg.value is less than contract balance (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance (e.g., 10 ETH)
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });
    
    // Verify initial contract balance
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(initialBalance);
    
    // Send a small amount (1 ETH) which is less than contract balance
    const smallAmount = ethers.parseEther("1");
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Call multiplicate with small amount from owner
    await instance.connect(owner).multiplicate(addr1.address, { value: smallAmount });
    
    // Check that addr1 did NOT receive the funds (original behavior with >=)
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore);
    
    // Check contract balance remains unchanged (mutant would drain it)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(initialBalance);
  });
});