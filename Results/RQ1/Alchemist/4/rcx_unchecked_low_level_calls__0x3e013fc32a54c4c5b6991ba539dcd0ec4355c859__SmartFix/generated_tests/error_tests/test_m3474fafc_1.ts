import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - m3474fafc", function () {
  it("should kill mutant by verifying transfer occurs when msg.value >= contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with initial balance via receive function
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: instanceAddress,
      value: initialFunding
    });

    // Get contract balance before calling multiplicate
    const balanceBefore = await ethers.provider.getBalance(instanceAddress);
    expect(balanceBefore).to.equal(initialFunding);

    // Get addr2's balance before
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value equal to contract balance (should trigger the if block in original)
    const sendValue = balanceBefore; // msg.value >= address(this).balance
    await instance.connect(owner).multiplicate(addr2.address, { value: sendValue });

    // Check that the contract transferred its entire balance (balanceBefore + sendValue) to addr2
    const contractBalanceAfter = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalanceAfter).to.equal(0);

    const addr2BalanceAfter = await ethers.provider.getBalance(addr2.address);
    const expectedTransfer = balanceBefore + sendValue; // 2 ether
    expect(addr2BalanceAfter - addr2BalanceBefore).to.equal(expectedTransfer);
  });
});