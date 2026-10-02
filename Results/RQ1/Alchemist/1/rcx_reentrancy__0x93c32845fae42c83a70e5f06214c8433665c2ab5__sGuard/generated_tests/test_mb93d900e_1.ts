import { expect } from "chai";
import { ethers } } from "hardhat";

describe("X_WALLET mutant kill test - mb93d900e", function () {
  it("should kill mutant by depositing more than MinSum and trying to collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Check MinSum is 1 ether
    const minSum = await instance.MinSum();
    expect(minSum).to.equal(ethers.parseEther("1"));
    
    // Deposit 2 ether (more than MinSum) into the contract
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 100; // future unlock time
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Verify balance is 2 ether
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine");
    
    // Try to collect 1 ether - should succeed on original but fail on mutant
    const collectAmount = ethers.parseEther("1");
    
    // On original: balance(2) >= MinSum(1) is true, so it should succeed
    // On mutant: balance(2) == MinSum(1) is false, so it should revert
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});