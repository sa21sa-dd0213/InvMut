import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m3aaa3e02 detection", function () {
  it("should detect mutant by verifying balance equals deposited amount (not amount+1)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");

    // Deposit exactly 1 ether
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check balance - on original it should be exactly 1 ether
    // On mutant it would be 1 ether + 1 wei, causing the assertion to fail
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});