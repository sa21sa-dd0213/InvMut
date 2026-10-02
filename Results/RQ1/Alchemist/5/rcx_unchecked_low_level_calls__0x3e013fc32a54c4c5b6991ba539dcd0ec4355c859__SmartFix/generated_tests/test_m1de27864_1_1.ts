import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m1de27864", function () {
  it("should kill mutant by calling multiplicate with msg.value equal to contract balance, expecting success (original) vs revert (mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to make the test meaningful
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Verify initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Call multiplicate with msg.value equal to current contract balance
    // This satisfies the outer if condition (msg.value >= address(this).balance)
    const multiplicateAmount = fundAmount;
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: multiplicateAmount
    });

    // In the original contract, this should succeed (the require check passes)
    // In the mutant, the require check fails (since msg.value + balance > balance, so <= is false)
    // Thus we expect the transaction to revert on the mutant
    await expect(tx).to.be.reverted;
  });
});