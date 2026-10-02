import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m16940406 test", function () {
  it("should detect that sending ether to address(0) burns funds instead of transferring to owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const sendAmount = ethers.parseEther("1.0");

    // Send ether to the contract first (fallback)
    const tx1 = await addr1.sendTransaction({
      to: contractAddress,
      value: sendAmount
    });
    await tx1.wait();

    // Check contract has the balance
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    expect(contractBalanceBefore).to.equal(sendAmount);

    // Call go() - this will try to send the contract balance to address(0) then to owner
    const tx2 = await instance.connect(owner).go();
    await tx2.wait();

    // After go(), the contract should have zero balance (all ether sent to address(0) and burned)
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    expect(contractBalanceAfter).to.equal(0);

    // Owner should NOT have received the funds (they were burned to address(0))
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    // Owner only pays gas fees, but does not receive the ether
    expect(finalOwnerBalance).to.be.lessThan(initialOwnerBalance);
  });
});