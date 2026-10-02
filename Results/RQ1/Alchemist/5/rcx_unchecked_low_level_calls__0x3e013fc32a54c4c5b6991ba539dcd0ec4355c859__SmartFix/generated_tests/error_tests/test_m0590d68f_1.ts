import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - m0590d68f", function () {
  it("should detect the mutant that changes >= to > by sending exactly the contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some initial balance
    const initialFund = ethers.parseEther("10");
    await owner.sendTransaction({
      to: contractAddress,
      value: initialFund
    });

    // Get contract balance
    const contractBalance = await ethers.provider.getBalance(contractAddress);

    // Send exactly the contract balance to multiplicate - this should trigger transfer in original but not in mutant
    const recipient = addr2;
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);

    await instance.connect(owner).multiplicate(recipient.address, { value: contractBalance });

    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

    // In the original (>=), the recipient would receive the funds
    // In the mutant (>), with equal values, the transfer is skipped
    // So we expect the recipient balance to have increased in the original but not in the mutant
    // This test will fail on the mutant because the transfer doesn't happen
    expect(recipientBalanceAfter).to.be.gt(recipientBalanceBefore);
  });
});