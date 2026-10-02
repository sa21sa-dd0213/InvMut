import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant me5ff4b17", function () {
  it("should revert when sending non-zero msg.value to multiplicate due to equality check in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send non-zero msg.value to multiplicate - should revert in mutant because
    // (balance + msg.value) == balance is false when msg.value > 0
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;

    // Verify no balance was transferred
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});