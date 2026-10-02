import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m32b61b19 test", function () {
  it("should detect the mutant by verifying exact balance transfer", async function () {
    const [owner, recipient] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance
    const initialFund = ethers.parseEther("2.0");
    await owner.sendTransaction({
      to: contractAddress,
      value: initialFund
    });

    // Record recipient's balance before
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);

    // Send exactly 1 ether to multiplicate
    const sendAmount = ethers.parseEther("1.0");
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    
    // The condition msg.value >= address(this).balance requires 1 >= 2, so we need to adjust
    // Actually we need to make msg.value >= contract balance to trigger the transfer path
    // Let's send enough to meet the condition
    const largeSend = ethers.parseEther("5.0");
    await instance.connect(owner).multiplicate(recipient.address, { value: largeSend });

    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

    // Expected: contract balance becomes 0, recipient gets contractBalanceBefore + largeSend
    const expectedRecipientGain = contractBalanceBefore + largeSend;
    
    // For original: recipientBalanceAfter - recipientBalanceBefore = expectedRecipientGain
    // For mutant: recipient gets 1 wei less
    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(expectedRecipientGain);
    
    // Also verify contract is drained
    expect(contractBalanceAfter).to.equal(0n);
  });
});