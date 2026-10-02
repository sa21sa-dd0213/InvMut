import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mac3bc81d", function () {
  it("should detect mutant that replaces oCredit > 0 with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Verify deposit was credited
    let userCredit = await instance.credit(addr1.address);
    expect(userCredit).to.equal(depositAmount);

    // User calls withdrawAll - on original this would succeed, on mutant it does nothing
    const withdrawTx = await instance.connect(addr1).withdrawAll();
    await withdrawTx.wait();

    // Check that user's credit was NOT reduced (mutant fails to execute withdrawal)
    userCredit = await instance.credit(addr1.address);
    expect(userCredit).to.equal(depositAmount);

    // Check that contract balance was NOT reduced
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    expect(finalContractBalance).to.equal(initialContractBalance + depositAmount);
  });
});