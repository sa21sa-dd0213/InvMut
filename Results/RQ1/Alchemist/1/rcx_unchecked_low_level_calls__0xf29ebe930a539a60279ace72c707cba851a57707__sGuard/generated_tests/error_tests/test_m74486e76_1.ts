import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m74486e76 - replace target with address(0)", function () {
  it("should revert or fail when checking owner receives exact msg.value after call to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const sendAmount = ethers.parseEther("1.0");

    // Call go() from addr1 with 1 ETH
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();

    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Original: owner should receive exactly sendAmount (1 ETH)
    // Mutant: ETH is burned via call to address(0), so owner gets less or nothing
    expect(finalOwnerBalance - initialOwnerBalance).to.equal(sendAmount);
  });
});