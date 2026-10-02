import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant mac3bc81d by verifying withdrawal is not skipped when user has credit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).deposit({ value: depositAmount });

    // Record user's initial balance
    const initialUserBalance = await ethers.provider.getBalance(user.address);

    // User calls withdrawAll
    const tx = await instance.connect(user).withdrawAll();
    const receipt = await tx.wait();

    // After withdrawal, user should have received the deposited ether
    const finalUserBalance = await ethers.provider.getBalance(user.address);
    // The user's balance should have increased by approximately 1 ether (minus gas)
    expect(finalUserBalance - initialUserBalance + receipt!.gasUsed * receipt!.gasPrice).to.equal(depositAmount);

    // Additionally, the user's credit in the contract should be 0
    const userCredit = await instance.credit(user.address);
    expect(userCredit).to.equal(0);

    // The contract balance should be 0
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});