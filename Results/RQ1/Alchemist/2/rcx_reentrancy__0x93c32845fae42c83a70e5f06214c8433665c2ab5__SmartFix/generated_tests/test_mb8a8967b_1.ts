import { expect } from "chai";
import { ethers } } from "hardhat";

describe("X_WALLET mutant mb8a8967b - Collect balance mutation", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let LogFactory: any;
  let logInstance: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    LogFactory = await ethers.getContractFactory("Log");
    logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
  });

  it("should detect the mutant by verifying balance decreases after Collect", async function () {
    // Arrange: fund the contract with some ether to allow collection
    const depositAmount = ethers.parseEther("5");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });

    // addr1 calls Put to deposit 1 ether with unlock time in the past
    const putAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: putAmount });
    
    // Verify addr1's balance is 1 ether
    const balanceBefore = (await instance.Acc(addr1.address)).balance;
    expect(balanceBefore).to.equal(putAmount);

    // Act: addr1 collects the full 1 ether
    const collectAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).Collect(collectAmount);
    await tx.wait();

    // Assert: In the original contract, balance should be 0 (1 - 1)
    // In the mutant, balance would be 2 (1 + 1) - this assertion fails on the mutant
    const balanceAfter = (await instance.Acc(addr1.address)).balance;
    expect(balanceAfter).to.equal(0);
  });
});