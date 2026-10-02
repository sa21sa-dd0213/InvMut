import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m20108da4", function () {
  it("should detect mutant that changes msg.value to msg.value-1 in condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Get the contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly the contract balance as msg.value
    // Original: msg.value >= contractBalance => true (transfers 2x balance)
    // Mutant: msg.value-1 >= contractBalance => false (no transfer)
    const recipientBalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    await instance.connect(owner).multiplicate(addr1.address, {
      value: contractBalance
    });

    const recipientBalanceAfter = await ethers.provider.getBalance(addr1.address);
    const receivedAmount = recipientBalanceAfter - recipientBalanceBefore;

    // On original: recipient should get contractBalance + msg.value = 2 * contractBalance
    // On mutant: no transfer occurs, recipient gets 0
    expect(receivedAmount).to.equal(contractBalance * 2n);
  });
});