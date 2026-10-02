import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - withdraw function", function () {
  it("should allow owner to withdraw and kill mutant that uses != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ETH from the owner
    const fundAmount = ethers.parseEther("1.0");
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    await fundTx.wait();
    
    // Get initial balances
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Owner calls withdraw - this should succeed in original but fail in mutant
    const withdrawTx = await instance.connect(owner).withdraw();
    await withdrawTx.wait();
    
    // Verify the contract balance is now zero
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(0);
    
    // Verify owner received the funds
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
  });
});