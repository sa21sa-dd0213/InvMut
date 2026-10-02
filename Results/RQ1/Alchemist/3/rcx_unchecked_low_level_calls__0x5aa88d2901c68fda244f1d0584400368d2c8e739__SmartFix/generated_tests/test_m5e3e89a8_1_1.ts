import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should kill mutant m5e3e89a8 by sending value greater than contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 1 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Send 2 ETH (greater than current balance of 1 ETH) from owner
    await instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("2") });
    
    // Check that the transfer occurred (original behavior)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // In the original, the transfer should happen (contract balance becomes 0, addr1 gets 3 ETH)
    expect(contractBalanceAfter).to.equal(0);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + ethers.parseEther("3"));
  });
});