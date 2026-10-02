import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should kill mutant m32b61b19 by verifying contract balance is zero after multiplicate call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance
    const initialBalance = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialBalance
    });
    
    // Get contract balance before multiplicate call
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(initialBalance);
    
    // Call multiplicate with msg.value equal to contract balance
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: initialBalance
    });
    await tx.wait();
    
    // Check that contract balance is zero (original behavior) - mutant will leave 1 wei
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(0);
  });
});