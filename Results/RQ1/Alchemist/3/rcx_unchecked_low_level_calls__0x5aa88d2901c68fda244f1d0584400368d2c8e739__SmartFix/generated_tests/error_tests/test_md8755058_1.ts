import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant md8755058 by sending non-zero msg.value when contract balance is non-zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Get initial balances
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with a non-zero msg.value (e.g., 1 ether)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Verify the transfer happened correctly (original behavior)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // The contract should have sent all its balance + msg.value to addr1
    expect(contractBalanceAfter).to.equal(0);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + contractBalanceBefore + ethers.parseEther("1.0"));
  });
});