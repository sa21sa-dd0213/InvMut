import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m617e63be", function () {
  it("should not transfer funds when msg.value is less than contract balance (original >= condition)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to create a balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get contract balance before the call
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send a small amount (1 wei) to multiplicate - this should NOT trigger transfer in original
    // because msg.value (1 wei) < address(this).balance (10 ether)
    await instance.connect(addr1).multiplicate(addr1.address, { value: 1 });

    // Get contract balance after the call
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, the condition msg.value >= address(this).balance is FALSE
    // so no transfer should happen and balance should remain the same
    // In the mutant, the condition msg.value <= address(this).balance is TRUE
    // so transfer would happen and balance would change
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});