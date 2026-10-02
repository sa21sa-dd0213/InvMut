import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mcc648c58 test", function () {
  it("should detect mutant that adds 1 extra wei to deposited amount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");

    // Deposit exactly 1 ether
    await instance.connect(owner).addToBalance({ value: depositAmount });

    // Check balance recorded in contract
    const recordedBalance = await instance.getBalance(owner.address);
    
    // On original, balance should be exactly depositAmount
    // On mutant, balance will be depositAmount + 1 wei
    // Withdraw all balance
    await instance.connect(owner).withdrawBalance();

    // Check contract's ether balance after withdrawal
    const contractBalance = await ethers.provider.getBalance(instance.target);
    
    // On original: contract balance should be 0 (all withdrawn)
    // On mutant: contract will still have 1 wei because recorded balance was 1 wei too high
    // but actual sent amount was only depositAmount, leaving 1 wei stuck
    expect(contractBalance).to.equal(0);
  });
});