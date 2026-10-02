import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mac3bc81d", function () {
  it("should detect mutant that changes oCredit > 0 to false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check initial balance of addr1 in contract
    const initialCredit = await instance.credit(addr1.address);
    expect(initialCredit).to.equal(depositAmount);

    // Call withdrawAll from addr1
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // Verify that the withdrawal did NOT happen (mutant behavior)
    // The credit should still be the deposit amount since condition is false
    const finalCredit = await instance.credit(addr1.address);
    expect(finalCredit).to.equal(depositAmount);

    // Also verify contract balance remains unchanged
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(depositAmount);
  });
});