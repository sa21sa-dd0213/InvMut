import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant mdbd4e99b by verifying balance consistency after deposit and withdrawal", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits 1 ETH
    const txDeposit = await instance.connect(user).deposit({ value: depositAmount });
    await txDeposit.wait();

    // User withdraws all their credit
    const txWithdraw = await instance.connect(user).withdrawAll();
    await txWithdraw.wait();

    // Check contract balance - in the original contract it should be 0
    // In the mutant, credit[user] was set to depositAmount + 1 wei, so the withdrawal
    // attempt will either revert (if insufficient balance) or leave 1 wei in the contract
    const contractBalance = await ethers.provider.getBalance(instance.target);
    
    // The mutant causes either a revert during withdrawal or leaves a non-zero balance
    // We assert that the final balance is exactly 0, which the mutant cannot satisfy
    expect(contractBalance).to.equal(0);
  });
});