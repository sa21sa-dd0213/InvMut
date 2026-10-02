import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test", function () {
  it("should detect mutant mc9495329 by verifying recipient receives correct amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialFunding = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Get contract balance before the call
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );

    // Prepare the call to multiplicate
    const msgValue = ethers.parseEther("5");
    const recipient = addr2.address;
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient);

    // Execute multiplicate from owner
    await instance.connect(owner).multiplicate(recipient, { value: msgValue });

    // Check recipient balance
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient);

    // Original: recipient should get contractBalanceBefore + msgValue
    // Mutant: recipient would get contractBalanceBefore - msgValue
    const expectedOriginalAmount = contractBalanceBefore + msgValue;
    const actualReceived = recipientBalanceAfter - recipientBalanceBefore;

    // This assertion will pass on original but fail on mutant
    expect(actualReceived).to.equal(expectedOriginalAmount);
  });
});