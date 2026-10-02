import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection test", function () {
  it("should detect balance manipulation in deposit function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: deposit 1 wei from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check that credit mapping shows exactly 1 ETH
    const creditAfterDeposit = await instance.credit(addr1.address);
    expect(creditAfterDeposit).to.equal(depositAmount);

    // Now withdraw all from addr1
    await instance.connect(addr1).withdrawAll();

    // After withdrawal, credit should be 0
    const creditAfterWithdraw = await instance.credit(addr1.address);
    expect(creditAfterWithdraw).to.equal(0);

    // In the mutant, balance was incremented by msg.value+1, so contract should have 1 wei left
    // In the original, balance would be 0
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // The mutant will leave 1 wei in the contract, so we expect balance > 0
    // This assertion fails on the original (balance = 0) but passes on the mutant
    expect(contractBalance).to.equal(1);
  });
});