import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m09066a54 (replace + with *)", function () {
  it("should kill the mutant by sending small msg.value when contract has non-zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1"));

    // Call multiplicate with a small msg.value (1 wei)
    // Original: transfers initialBalance + 1 wei (succeeds)
    // Mutant:   transfers initialBalance * 1 wei (huge number, should revert)
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 1 })
    ).to.be.reverted;
  });
});