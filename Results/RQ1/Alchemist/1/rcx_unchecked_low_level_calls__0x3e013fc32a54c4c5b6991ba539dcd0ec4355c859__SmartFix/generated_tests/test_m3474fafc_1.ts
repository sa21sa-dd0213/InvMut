import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m3474fafc", function () {
  it("should transfer contract balance plus sent amount when msg.value >= contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Record initial balances
    const initialContractBalance = await ethers.provider.getBalance(instanceAddress);
    const initialRecipientBalance = await ethers.provider.getBalance(addr2.address);

    // Send ether to multiplicate with msg.value >= contract balance
    const sendAmount = initialContractBalance; // exactly equal
    const tx = await instance.connect(addr1).multiplicate(addr2.address, {
      value: sendAmount
    });
    await tx.wait();

    // Check recipient received original contract balance + sent amount
    const expectedTransfer = initialContractBalance + sendAmount;
    const finalRecipientBalance = await ethers.provider.getBalance(addr2.address);
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + expectedTransfer);

    // Contract should be drained (balance = 0)
    const finalContractBalance = await ethers.provider.getBalance(instanceAddress);
    expect(finalContractBalance).to.equal(0);
  });
});