import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - m3dd4bb80", function () {
  it("should detect mutant that adds 1 extra wei to credit on deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");

    // addr1 deposits exactly 1 ether
    await instance.connect(addr1).deposit({ value: depositAmount });

    // addr1 withdraws all
    await instance.connect(addr1).withdrawAll();

    // After withdrawal, addr1's credit should be 0
    // The contract balance should be 0
    // If the mutant is active, addr1 received 1 extra wei (total depositAmount + 1)
    // This would either cause the withdrawal to revert (insufficient balance)
    // or leave the contract with a negative balance
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);

    // Also verify addr1's credit is zero
    // We need to check this via a getter - but the contract has no getter for credit
    // So we rely on the contract balance check to detect the mutant
  });
});