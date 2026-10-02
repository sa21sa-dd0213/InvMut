import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant m0d55ce44 - kill test", function () {
  it("should revert when balance equals MinSum due to > instead of >=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Deposit exactly 1 ether (MinSum = 1 ether) from addr1
    const depositAmount = ethers.parseEther("1");
    const txDeposit = await instance.connect(addr1).Put(0, { value: depositAmount });
    await txDeposit.wait();
    
    // Verify balance equals MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect exactly 1 ether
    // On original: should succeed (balance >= MinSum)
    // On mutant: should revert (balance > MinSum is false when equal)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});