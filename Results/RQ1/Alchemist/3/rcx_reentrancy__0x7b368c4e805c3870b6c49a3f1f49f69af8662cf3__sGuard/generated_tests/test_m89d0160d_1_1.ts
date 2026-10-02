import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m89d0160d - Collect with false condition", function () {
  it("should detect mutant by verifying balance decreases after successful Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Fund the contract with some ether via Put
    const putAmount = ethers.parseEther("10");
    const tx = await instance.connect(user).Put(0, { value: putAmount });
    await tx.wait();

    // Verify initial balance
    const initialBalance = await instance.Acc(user.address);
    expect(initialBalance.balance).to.equal(putAmount);

    // User's ether balance before Collect
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // Collect a portion of the funds
    const collectAmount = ethers.parseEther("5");
    const collectTx = await instance.connect(user).Collect(collectAmount);
    await collectTx.wait();

    // Check user received the ether
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    const receipt = await collectTx.wait();
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const expectedUserIncrease = collectAmount - gasCost;
    expect(userBalanceAfter - userBalanceBefore).to.be.closeTo(expectedUserIncrease, ethers.parseEther("0.01"));

    // Check the contract's recorded balance for user
    const finalBalance = await instance.Acc(user.address);

    // On original: balance should decrease by collectAmount
    // On mutant: balance remains unchanged (because if(false) prevents subtraction)
    expect(finalBalance.balance).to.equal(initialBalance.balance - collectAmount);
  });
});