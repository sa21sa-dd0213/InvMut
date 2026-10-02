import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m86b1a35c by detecting that Collect always reverts when condition is replaced with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log contract address as constructor argument
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Fund addr1 with some ether
    const depositAmount = ethers.parseEther("2.0");
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const unlockTime = currentTimestamp - 3600; // 1 hour in the past
    
    // addr1 deposits 2 ether with an unlock time in the past
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Verify balance is set correctly
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect 1 ether - this should succeed on original but fail on mutant
    const withdrawAmount = ethers.parseEther("1.0");
    
    // On the original contract, this call should succeed (all conditions met)
    // On the mutant, this call should revert because condition is always false
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
    
    // Verify that the balance was NOT decreased (since transaction reverted)
    const holderAfter = await instance.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});