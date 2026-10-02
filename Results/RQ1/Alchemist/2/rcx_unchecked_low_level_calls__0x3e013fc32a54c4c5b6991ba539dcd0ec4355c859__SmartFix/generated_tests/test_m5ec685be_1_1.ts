import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m5ec685be", function () {
  it("should kill mutant by sending value exactly 1 wei less than contract balance", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether (e.g., 10 ether)
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Verify initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Get recipient's initial balance
    const recipientInitialBalance = await ethers.provider.getBalance(recipient.address);

    // Send exactly 1 wei less than contract balance
    const sendValue = fundAmount - 1n;

    // Attempt to call multiplicate from any address (no restriction on caller)
    await expect(
      instance.connect(attacker).multiplicate(recipient.address, { value: sendValue })
    ).to.not.be.reverted;

    // Verify contract balance unchanged (original behavior: condition false, no transfer)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(fundAmount);

    // Verify recipient balance unchanged
    const recipientFinalBalance = await ethers.provider.getBalance(recipient.address);
    expect(recipientFinalBalance).to.equal(recipientInitialBalance);

    // If the mutant were present, the condition would be true (sendValue+1 >= balance),
    // causing a transfer to recipient, which would make these assertions fail.
  });
});