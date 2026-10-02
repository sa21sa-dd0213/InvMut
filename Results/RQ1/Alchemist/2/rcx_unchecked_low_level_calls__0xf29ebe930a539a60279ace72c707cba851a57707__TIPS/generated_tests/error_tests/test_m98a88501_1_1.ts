import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m98a88501 test", function () {
  it("should detect mutant that changes msg.value to msg.value+1 by sending exactly 1 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of owner
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1n });
    await tx.wait();

    // Check that the transaction succeeded (no revert)
    // The owner should have received the 1 wei
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance + 1n);
  });
});