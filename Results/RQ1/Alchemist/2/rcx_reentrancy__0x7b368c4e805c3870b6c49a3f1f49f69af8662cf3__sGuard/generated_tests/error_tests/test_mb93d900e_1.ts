import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mb93d900e", function () {
  it("should kill mutant by depositing > MinSum and collecting", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 2 ether (more than MinSum of 1 ether) from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Wait for block timestamp to advance past unlockTime (unlockTime = block.timestamp since Put(0) sets it)
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 1 ether - should succeed on original but fail on mutant
    const collectAmount = ethers.parseEther("1");
    
    // Original contract: acc.balance (2) >= MinSum (1) is true => should succeed
    // Mutant: acc.balance (2) == MinSum (1) is false => should revert
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});