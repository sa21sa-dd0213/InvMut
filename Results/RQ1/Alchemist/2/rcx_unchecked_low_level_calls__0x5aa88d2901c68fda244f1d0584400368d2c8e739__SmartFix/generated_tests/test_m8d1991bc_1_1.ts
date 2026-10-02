import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m8d1991bc detection", function () {
  it("should detect mutant by verifying transfer occurs when msg.value >= contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const fundAmount = ethers.parseEther("2.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get contract balance before
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Call multiplicate with msg.value equal to current contract balance
    const msgValue = contractBalanceBefore; // This satisfies msg.value >= address(this).balance
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    await instance.connect(owner).multiplicate(addr1.address, { value: msgValue });

    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    const expectedTransfer = contractBalanceBefore + msgValue;

    // In original: transfer happens. In mutant: transfer does NOT happen.
    // If mutant is present, addr1 balance will not increase by expectedTransfer
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(expectedTransfer);
  });
});