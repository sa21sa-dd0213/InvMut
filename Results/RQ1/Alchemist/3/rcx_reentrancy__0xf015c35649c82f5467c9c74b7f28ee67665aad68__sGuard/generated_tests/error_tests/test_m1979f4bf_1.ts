import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m1979f4bf", function () {
  it("should revert Collect when balance > MinSum after mutated condition change from >= to <=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = await instance.MinSum();
    
    // Deposit 2 ether (more than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is now > MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.balance).to.be.gt(MinSum);
    
    // Advance time past unlockTime (which was set to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect 1 ether - should succeed on original but revert on mutant
    const collectAmount = ethers.parseEther("1");
    
    // The mutant changes acc.balance >= MinSum to acc.balance <= MinSum
    // Since balance (2 ether) > MinSum (1 ether), the condition fails on mutant
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});