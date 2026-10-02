import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - mca9d8df8", function () {
  it("should kill mutant by verifying contract balance after go() call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance for the test
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Send a small amount of ETH to go() from addr1
    const sendAmount = ethers.parseEther("0.5");
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    await instance.connect(addr1).go({ value: sendAmount });

    // After go() executes, the contract balance should be 0
    // In the original: external call succeeds, then all balance is sent to owner
    // In the mutant: self-call returns funds to contract, then transfer sends 0 to owner
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // This assertion will fail for the mutant (balance > 0) but pass for original (balance == 0)
    expect(contractBalanceAfter).to.equal(0n);
  });
});